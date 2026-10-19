#include "AMPrivateInfo.h"
#include <stdlib.h>
#include <string.h>
static void put(uint8_t *p, uint32_t v) {
    for (unsigned i = 0; i < 4; i++)
        p[i] = (uint8_t)(v >> (8 * i));
}
static uint32_t get(const uint8_t *p) {
    return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24);
}
void AMPrivateFree(void *data) {
    free(data);
}
int AMPrivateEncode(const AMPrivateSlice items[3], uint8_t **output, size_t *size) {
    if (!items || !output || !size)
        return -1;
    *output = NULL;
    *size = 0;
    size_t total = 40;
    for (unsigned i = 0; i < 3; i++) {
        if ((!items[i].data && items[i].size) || items[i].size > UINT32_MAX - 15 ||
            total > UINT32_MAX - 15 - items[i].size)
            return -1;
        total += items[i].size + 15;
    }
    uint8_t *p = calloc(1, total);
    if (!p)
        return -1;
    put(p, 3);
    size_t at = 40;
    for (unsigned i = 0; i < 3; i++) {
        put(p + 4 + 4 * i, (uint32_t)at);
        put(p + at, (uint32_t)items[i].size);
        at += 4;
        if (items[i].size)
            memcpy(p + at, items[i].data, items[i].size);
        at += items[i].size;
        put(p + 16 + 4 * i, (uint32_t)at);
        put(p + at, 2);
        p[at + 4] = '_';
        p[at + 5] = (uint8_t)('1' + i);
        at += 6;
        put(p + 28 + 4 * i, (uint32_t)at);
        put(p + at, 1);
        p[at + 4] = 0;
        at += 5;
    }
    *output = p;
    *size = total;
    return 0;
}
int AMPrivateDecode(const void *data, size_t size, AMPrivateSlice items[3]) {
    if (!data || !items || size < 40 || size > UINT32_MAX)
        return -1;
    const uint8_t *p = data;
    if (get(p) != 3)
        return -1;
    size_t previous = 40;
    for (unsigned i = 0; i < 3; i++) {
        for (unsigned table = 0; table < 3; table++) {
            size_t at = get(p + 4 + 12 * table + 4 * i);
            if (at != previous || at > size - 4)
                return -1;
            size_t length = get(p + at);
            if (length > size - at - 4)
                return -1;
            if (table == 0) {
                items[i].data = p + at + 4;
                items[i].size = length;
            }
            if (table == 1 && (length != 2 || p[at + 4] != '_' || p[at + 5] != (uint8_t)('1' + i)))
                return -1;
            previous = at + 4 + length;
        }
    }
    return previous == size ? 0 : -1;
}
