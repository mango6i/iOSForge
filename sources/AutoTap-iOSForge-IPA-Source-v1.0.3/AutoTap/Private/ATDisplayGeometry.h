#ifndef ATDisplayGeometry_h
#define ATDisplayGeometry_h

#include <math.h>

// UIInterfaceOrientation values: 1 portrait, 2 upside down, 3 landscape RIGHT,
// 4 landscape LEFT. UIKit intentionally reverses the UIDeviceOrientation names.
// HID is always in the display's fixed,
// portrait coordinate space; HUD and script coordinates follow the interface.
// Keep these functions free of UIKit, locks and IPC: the HID filter uses them.
typedef struct { double x, y; } ATGeometryPoint;

typedef enum {
    ATOverlaySurfaceNone,
    ATOverlaySurfaceLocal,
    ATOverlaySurfaceHosted,
} ATOverlaySurface;

static inline ATOverlaySurface ATOverlaySurfaceForState(int visible, int foreground) {
    return !visible ? ATOverlaySurfaceNone : (foreground ? ATOverlaySurfaceLocal : ATOverlaySurfaceHosted);
}

static inline int ATOverlaySurfaceAcceptsInput(ATOverlaySurface surface, int localVisible,
                                               int hostedReady, int canvasAttached) {
    return canvasAttached && ((surface == ATOverlaySurfaceLocal && localVisible) ||
                              (surface == ATOverlaySurfaceHosted && hostedReady));
}

typedef enum {
    ATOverlayContextWait,
    ATOverlayContextKeep,
    ATOverlayContextRetire,
    ATOverlayContextAttach,
} ATOverlayContextAction;

// An obsolete registration must be retired before a replacement is attached.
// A nonzero cached ID is not proof that UIKit still uses that CAContext.
static inline ATOverlayContextAction ATOverlayContextPlan(unsigned registeredID, unsigned currentID, int hasHosting) {
    if (registeredID) {
        return registeredID == currentID && hasHosting ? ATOverlayContextKeep : ATOverlayContextRetire;
    }
    return currentID ? ATOverlayContextAttach : ATOverlayContextWait;
}

static inline int ATGeometryOrientationIsValid(long orientation) {
    return orientation >= 1 && orientation <= 4;
}

static inline double ATGeometryClamp(double value, double minimum, double maximum) {
    if (maximum < minimum) { return (minimum + maximum) * 0.5; }
    return fmin(fmax(isfinite(value) ? value : minimum, minimum), maximum);
}

static inline ATGeometryPoint ATGeometryFixedToInterface(ATGeometryPoint p, long orientation) {
    switch (orientation) {
        case 2: return (ATGeometryPoint){1.0 - p.x, 1.0 - p.y};
        case 3: return (ATGeometryPoint){p.y, 1.0 - p.x};
        case 4: return (ATGeometryPoint){1.0 - p.y, p.x};
        default: return p;
    }
}

static inline ATGeometryPoint ATGeometryInterfaceToFixed(ATGeometryPoint p, long orientation) {
    switch (orientation) {
        case 2: return (ATGeometryPoint){1.0 - p.x, 1.0 - p.y};
        case 3: return (ATGeometryPoint){1.0 - p.y, p.x};
        case 4: return (ATGeometryPoint){p.y, 1.0 - p.x};
        default: return p;
    }
}

// Clockwise rotation in UIKit's y-down coordinate space.
static inline double ATGeometryRotation(long orientation) {
    switch (orientation) {
        case 2: return 3.14159265358979323846;
        case 3: return 1.57079632679489661923;
        case 4: return -1.57079632679489661923;
        default: return 0;
    }
}

static inline double ATGeometryToolbarScale(int buttonCount, int horizontal,
                                             double availableWidth, double availableHeight,
                                             double requestedScale) {
    double longSide = 43.0 * buttonCount + 4.0 * (buttonCount - 1) + 14.0;
    double fitLong = (horizontal ? availableWidth : availableHeight) / fmax(longSide, 1.0);
    double fitShort = (horizontal ? availableHeight : availableWidth) / 57.0;
    return fmax(fmin(requestedScale, fmin(fitLong, fitShort)), 0.1);
}

// Convert normalized HID values, or fixed-space logical points, to HUD points.
// Never inset these coordinates to a safe area: edge gestures need the edge.
static inline ATGeometryPoint ATGeometryHIDToInterface(double x, double y,
                                                      double fixedWidth, double fixedHeight,
                                                      double width, double height, long orientation) {
    if (!(x >= 0 && x <= 1.001 && y >= 0 && y <= 1.001)) {
        x /= fmax(fixedWidth, 1.0);
        y /= fmax(fixedHeight, 1.0);
    }
    ATGeometryPoint p = ATGeometryFixedToInterface((ATGeometryPoint){x, y}, orientation);
    return (ATGeometryPoint){ATGeometryClamp(p.x, 0, 1) * width,
                             ATGeometryClamp(p.y, 0, 1) * height};
}

#endif
