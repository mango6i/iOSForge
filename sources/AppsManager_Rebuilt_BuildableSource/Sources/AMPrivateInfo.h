#ifndef AM_PRIVATE_INFO_H
#define AM_PRIVATE_INFO_H
#include <stddef.h>
#include <stdint.h>
/* Recovered FileContainer layout (original methods 0x100075b40, 0x100076438).
 * Three LE32 offset tables; each item is length+data, length+name, length+thumb.
 * The returned slices borrow the caller's input. Writer output must be free'd.
 */
typedef struct {
    const uint8_t *data;
    size_t size;
} AMPrivateSlice;
int AMPrivateEncode(const AMPrivateSlice items[3], uint8_t **output, size_t *size);
int AMPrivateDecode(const void *data, size_t size, AMPrivateSlice items[3]);
void AMPrivateFree(void *data);
#endif
