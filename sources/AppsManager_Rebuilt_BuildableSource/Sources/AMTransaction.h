#ifndef AM_TRANSACTION_H
#define AM_TRANSACTION_H
#include <stddef.h>
/* Ordered exclusive renames. No unlink, recursive deletion, or overwrite.
 * persist is called before/after each move and rollback move. Return nonzero
 * to abort. A journal must retain the full plan and the pending intent.
 */
typedef struct {
    const char *from;
    const char *to;
} AMMove;
typedef int (*AMMoveRename)(const char *from, const char *to, void *context);
typedef int (*AMMovePersist)(size_t completed, size_t pending, int rollingBack, void *context);
typedef struct {
    size_t completed;
    int error;
    int rollbackError;
} AMMoveResult;
int AMExclusiveRename(const char *from, const char *to, void *context);
AMMoveResult AMMovesExecute(const AMMove *moves, size_t count, AMMoveRename renameFunction,
                            AMMovePersist persist, void *context);
AMMoveResult AMMovesRollback(const AMMove *moves, size_t completed, AMMoveRename renameFunction,
                             AMMovePersist persist, void *context);
#endif
