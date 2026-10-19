/* Only the raw DEFLATE encoder is built. Upstream sources are unmodified. */
#define MINIZ_NO_ARCHIVE_APIS
#define MINIZ_NO_INFLATE_APIS
#define MINIZ_NO_ZLIB_APIS
#define MINIZ_NO_ZLIB_COMPATIBLE_NAMES
#include "miniz/miniz.c"
#include "miniz/miniz_tdef.c"
