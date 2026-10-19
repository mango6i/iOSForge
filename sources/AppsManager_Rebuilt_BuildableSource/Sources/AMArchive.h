#ifndef AM_ARCHIVE_H
#define AM_ARCHIVE_H
#include <stddef.h>
#include <stdint.h>
typedef struct AMArchive AMArchive;
/* Streaming ZIP64 writer. Caller supplies safe relative UTF-8 entry names. */
AMArchive *AMArchiveOpen(const char *path);
int AMArchiveAddFile(AMArchive *, const char *name, const char *source, uint32_t unix_mode);
int AMArchiveAddBytes(AMArchive *, const char *name, const void *bytes, size_t length,
                      uint32_t unix_mode);
int AMArchiveClose(AMArchive *);
void AMArchiveAbort(AMArchive *);
const char *AMArchiveError(const AMArchive *);
#endif
