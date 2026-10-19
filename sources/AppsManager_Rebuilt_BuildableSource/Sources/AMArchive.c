/* Rebuilt ZIP64 writer. Raw DEFLATE uses the pinned miniz dependency. */
#include "AMArchive.h"
#include "miniz/miniz_tdef.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#ifdef _WIN32
#include <io.h>
#define am_tell _ftelli64
#define am_sync _commit
#define am_fileno _fileno
#else
#include <unistd.h>
#define am_tell ftello
#define am_sync fsync
#define am_fileno fileno
#endif
typedef struct {
    char *name;
    uint64_t offset, size, compressed;
    uint32_t crc, mode;
    uint16_t method;
} Entry;
struct AMArchive {
    FILE *file;
    Entry *entries, *active;
    size_t count, capacity;
    char error[192];
    uint32_t crc_table[256];
    tdefl_compressor *compressor;
};
static int fail(AMArchive *a, const char *message) {
    snprintf(a->error, sizeof(a->error), "%s: %s", message, strerror(errno));
    return -1;
}
static int bytes(AMArchive *a, const void *p, size_t n) {
    if (!n)
        return 0;
    if (!p) {
        errno = EINVAL;
        return fail(a, "missing input bytes");
    }
    return fwrite(p, 1, n, a->file) == n ? 0 : fail(a, "write");
}
static mz_bool compressed_output(const void *p, int length, void *user) {
    AMArchive *a = user;
    if (length < 0 || bytes(a, p, (size_t)length))
        return MZ_FALSE;
    a->active->compressed += (uint64_t)length;
    return MZ_TRUE;
}
static int u16(AMArchive *a, uint16_t x) {
    unsigned char p[2] = {(unsigned char)x, (unsigned char)(x >> 8)};
    return bytes(a, p, 2);
}
static int u32(AMArchive *a, uint32_t x) {
    return u16(a, (uint16_t)x) || u16(a, (uint16_t)(x >> 16)) ? -1 : 0;
}
static int u64(AMArchive *a, uint64_t x) {
    return u32(a, (uint32_t)x) || u32(a, (uint32_t)(x >> 32)) ? -1 : 0;
}
static uint32_t crc_bytes(AMArchive *a, uint32_t crc, const unsigned char *p, size_t n) {
    for (size_t i = 0; i < n; i++)
        crc = (crc >> 8) ^ a->crc_table[(crc ^ p[i]) & 255];
    return crc;
}
static int safe_name(const char *s) {
    if (!s || !*s || s[0] == '/' || strchr(s, '\\') || strlen(s) > 65535)
        return 0;
    for (const char *p = s; *p;) {
        const char *end = strchr(p, '/');
        size_t n = end ? (size_t)(end - p) : strlen(p);
        if ((n == 2 && p[0] == '.' && p[1] == '.') || n == 0)
            return 0;
        if (!end)
            break;
        p = end + 1;
    }
    return 1;
}
AMArchive *AMArchiveOpen(const char *path) {
    if (!path)
        return NULL;
    AMArchive *a = calloc(1, sizeof(*a));
    if (!a)
        return NULL;
    for (unsigned i = 0; i < 256; i++) {
        uint32_t crc = i;
        for (unsigned j = 0; j < 8; j++)
            crc = (crc >> 1) ^ ((0u - (crc & 1u)) & 0xedb88320u);
        a->crc_table[i] = crc;
    }
    a->file = fopen(path, "wb");
    if (!a->file) {
        free(a);
        return NULL;
    }
    return a;
}
static Entry *start(AMArchive *a, const char *name, uint32_t mode, int compress) {
    if (a->error[0])
        return NULL;
    if (!safe_name(name)) {
        errno = EINVAL;
        fail(a, "unsafe ZIP entry");
        return NULL;
    }
    if (a->count == a->capacity) {
        size_t next = a->capacity ? a->capacity * 2 : 64;
        Entry *p = realloc(a->entries, next * sizeof(*p));
        if (!p) {
            fail(a, "allocate index");
            return NULL;
        }
        a->entries = p;
        a->capacity = next;
    }
    Entry *e = &a->entries[a->count];
    memset(e, 0, sizeof(*e));
    e->name = strdup(name);
    if (!e->name) {
        fail(a, "allocate name");
        return NULL;
    }
    a->count++;
    e->mode = mode;
    e->method = compress ? 8 : 0;
    a->active = e;
    if (compress) {
        if (!a->compressor)
            a->compressor = malloc(sizeof(*a->compressor));
        if (!a->compressor) {
            fail(a, "allocate compressor");
            return NULL;
        }
        if (tdefl_init(a->compressor, compressed_output, a, TDEFL_DEFAULT_MAX_PROBES) !=
            TDEFL_STATUS_OKAY) {
            errno = EIO;
            fail(a, "initialize compressor");
            return NULL;
        }
    }
    int64_t position = am_tell(a->file);
    if (position < 0) {
        fail(a, "tell");
        return NULL;
    }
    e->offset = (uint64_t)position;
    if (u32(a, 0x04034b50) || u16(a, 45) || u16(a, 0x808) || u16(a, e->method) || u16(a, 0) ||
        u16(a, 33) || u32(a, 0) || u32(a, 0xffffffff) || u32(a, 0xffffffff) ||
        u16(a, (uint16_t)strlen(name)) || u16(a, 20) || bytes(a, name, strlen(name)) || u16(a, 1) ||
        u16(a, 16) || u64(a, 0) || u64(a, 0))
        return NULL;
    return e;
}
static int content(AMArchive *a, Entry *e, const void *p, size_t n) {
    if (!n)
        return 0;
    if (!p) {
        errno = EINVAL;
        return fail(a, "missing input bytes");
    }
    if (e->method) {
        if (tdefl_compress_buffer(a->compressor, p, n, TDEFL_NO_FLUSH) != TDEFL_STATUS_OKAY) {
            errno = EIO;
            return fail(a, "compress data");
        }
        return 0;
    }
    if (bytes(a, p, n))
        return -1;
    e->compressed += n;
    return 0;
}
static int end_entry(AMArchive *a, Entry *e, uint32_t crc, uint64_t size) {
    if (e->method &&
        tdefl_compress_buffer(a->compressor, NULL, 0, TDEFL_FINISH) != TDEFL_STATUS_DONE) {
        errno = EIO;
        return fail(a, "finish compression");
    }
    e->crc = crc ^ 0xffffffffu;
    e->size = size;
    return u32(a, 0x08074b50) || u32(a, e->crc) || u64(a, e->compressed) || u64(a, size) ? -1 : 0;
}
int AMArchiveAddBytes(AMArchive *a, const char *name, const void *p, size_t n, uint32_t mode) {
    if (!a)
        return -1;
    Entry *e = start(a, name, mode, n > 64);
    if (!e)
        return -1;
    if (content(a, e, p, n))
        return -1;
    return end_entry(a, e, crc_bytes(a, 0xffffffffu, p, n), n);
}
int AMArchiveAddFile(AMArchive *a, const char *name, const char *source, uint32_t mode) {
    if (!a)
        return -1;
    if (!source) {
        errno = EINVAL;
        return fail(a, "missing input path");
    }
    FILE *input = fopen(source, "rb");
    if (!input)
        return fail(a, "open input");
    Entry *e = start(a, name, mode, 1);
    if (!e) {
        fclose(input);
        return -1;
    }
    unsigned char buffer[65536];
    uint32_t crc = 0xffffffffu;
    uint64_t size = 0;
    int result = 0;
    size_t n;
    while ((n = fread(buffer, 1, sizeof(buffer), input)) > 0) {
        if (content(a, e, buffer, n)) {
            result = -1;
            break;
        }
        crc = crc_bytes(a, crc, buffer, n);
        size += n;
    }
    if (ferror(input))
        result = fail(a, "read input");
    if (fclose(input) && !result)
        result = fail(a, "close input");
    return result ? result : end_entry(a, e, crc, size);
}
static void dispose(AMArchive *a) {
    for (size_t i = 0; i < a->count; i++)
        free(a->entries[i].name);
    free(a->entries);
    free(a->compressor);
    free(a);
}
void AMArchiveAbort(AMArchive *a) {
    if (a) {
        if (a->file)
            fclose(a->file);
        dispose(a);
    }
}
const char *AMArchiveError(const AMArchive *a) {
    return a->error;
}
int AMArchiveClose(AMArchive *a) {
    if (!a)
        return -1;
    if (a->error[0]) {
        AMArchiveAbort(a);
        return -1;
    }
    uint64_t directory = (uint64_t)am_tell(a->file);
    int r = 0;
    for (size_t i = 0; i < a->count && !r; i++) {
        Entry *e = &a->entries[i];
        r = u32(a, 0x02014b50) || u16(a, 0x32d) || u16(a, 45) || u16(a, 0x808) ||
            u16(a, e->method) || u16(a, 0) || u16(a, 33) || u32(a, e->crc) || u32(a, 0xffffffff) ||
            u32(a, 0xffffffff) || u16(a, (uint16_t)strlen(e->name)) || u16(a, 28) || u16(a, 0) ||
            u16(a, 0) || u16(a, 0) || u32(a, e->mode << 16) || u32(a, 0xffffffff) ||
            bytes(a, e->name, strlen(e->name)) || u16(a, 1) || u16(a, 24) || u64(a, e->size) ||
            u64(a, e->compressed) || u64(a, e->offset);
    }
    uint64_t position = (uint64_t)am_tell(a->file), length = position - directory;
    if (!r)
        r = u32(a, 0x06064b50) || u64(a, 44) || u16(a, 45) || u16(a, 45) || u32(a, 0) ||
            u32(a, 0) || u64(a, a->count) || u64(a, a->count) || u64(a, length) ||
            u64(a, directory) || u32(a, 0x07064b50) || u32(a, 0) || u64(a, position) || u32(a, 1) ||
            u32(a, 0x06054b50) || u16(a, 0) || u16(a, 0) || u16(a, 0xffff) || u16(a, 0xffff) ||
            u32(a, 0xffffffff) || u32(a, 0xffffffff) || u16(a, 0);
    if (fflush(a->file) || am_sync(am_fileno(a->file)))
        r = -1;
    if (fclose(a->file))
        r = -1;
    a->file = NULL;
    dispose(a);
    return r ? -1 : 0;
}
