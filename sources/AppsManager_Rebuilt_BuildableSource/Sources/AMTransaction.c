#include "AMTransaction.h"
#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#ifdef _WIN32
#include <windows.h>
#include <stdlib.h>
static wchar_t *wide(const char *text) {
    int n = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text, -1, NULL, 0);
    if (n <= 0)
        return NULL;
    wchar_t *result = malloc((size_t)n * sizeof(*result));
    if (!result)
        return NULL;
    if (!MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, text, -1, result, n)) {
        free(result);
        return NULL;
    }
    return result;
}
#endif
int AMExclusiveRename(const char *from, const char *to, void *context) {
    (void)context;
#ifdef _WIN32
    wchar_t *source = wide(from), *destination = wide(to);
    if (!source || !destination) {
        free(source);
        free(destination);
        return EINVAL;
    }
    int ok = MoveFileExW(source, destination, MOVEFILE_WRITE_THROUGH) != 0;
    DWORD code = ok ? 0 : GetLastError();
    free(source);
    free(destination);
    return (int)code;
#elif defined(__APPLE__)
    return renamex_np(from, to, RENAME_EXCL) == 0 ? 0 : (errno ? errno : EIO);
#else
    /* A new platform must supply an exclusive rename callback. */
    (void)from;
    (void)to;
    return ENOSYS;
#endif
}
AMMoveResult AMMovesRollback(const AMMove *moves, size_t completed, AMMoveRename renameFunction,
                             AMMovePersist persist, void *context) {
    AMMoveResult result = {completed, 0, 0};
    if (!renameFunction)
        renameFunction = AMExclusiveRename;
    if (!moves && completed) {
        result.rollbackError = EINVAL;
        return result;
    }
    while (result.completed) {
        size_t index = result.completed - 1;
        int code = persist ? persist(result.completed, index, 1, context) : 0;
        if (code) {
            result.rollbackError = code;
            break;
        }
        code = renameFunction(moves[index].to, moves[index].from, context);
        if (code) {
            result.rollbackError = code;
            break;
        }
        result.completed--;
        code = persist ? persist(result.completed, SIZE_MAX, 1, context) : 0;
        if (code) {
            result.rollbackError = code;
            break;
        }
    }
    return result;
}
AMMoveResult AMMovesExecute(const AMMove *moves, size_t count, AMMoveRename renameFunction,
                            AMMovePersist persist, void *context) {
    AMMoveResult result = {0, 0, 0};
    if (!renameFunction)
        renameFunction = AMExclusiveRename;
    if (!moves && count) {
        result.error = EINVAL;
        return result;
    }
    for (size_t i = 0; i < count; i++) {
        int code = persist ? persist(result.completed, i, 0, context) : 0;
        if (!code)
            code = renameFunction(moves[i].from, moves[i].to, context);
        if (!code) {
            result.completed++;
            code = persist ? persist(result.completed, SIZE_MAX, 0, context) : 0;
        }
        if (code) {
            result.error = code;
            AMMoveResult rollback =
                AMMovesRollback(moves, result.completed, renameFunction, persist, context);
            result.completed = rollback.completed;
            result.rollbackError = rollback.rollbackError;
            break;
        }
    }
    return result;
}
