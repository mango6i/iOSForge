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

// Only an actual, captured swipe needs to finish in its DOWN coordinate space.
// A tap recorder or a toolbar contact must never hold the viewport in portrait.
static inline int ATOverlayShouldDeferOrientation(int recordingActive, int capturesGestures,
                                                  int contactActive, int captureCandidate) {
    return recordingActive && capturesGestures && contactActive && captureCandidate;
}

static inline int ATOverlayCountdownVisible(int running, int paused, int recording, long seconds) {
    return running && !paused && !recording && seconds > 0;
}

static inline int ATGeometryOrientationMatchesViewport(long orientation, double width, double height) {
    return ATGeometryOrientationIsValid(orientation) && width > 0 && height > 0 &&
        isfinite(width) && isfinite(height) &&
        (fabs(width - height) < 0.5 || ((orientation >= 3) == (width > height)));
}

// During a UIKit rotation, the scene's orientation and root-view size can be
// delivered in either order. Resolve against the MEASURED view, not a window's
// old frame. Never force that view into the other orientation halfway through.
static inline long ATGeometryMeasuredHostOrientation(long scene, long previous, double width, double height) {
    if (ATGeometryOrientationMatchesViewport(scene, width, height)) { return scene; }
    if (ATGeometryOrientationMatchesViewport(previous, width, height)) { return previous; }
    return width > height ? 3 : 1;
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

typedef struct {
    long hostOrientation, displayOrientation;
    double width, height, rotation;
    int ready;
} ATGeometryCanvas;

static inline ATGeometryCanvas ATGeometryResolveCanvas(int local, long scene, long previousHost,
                                                       long requestedDisplay, double hostWidth, double hostHeight,
                                                       double fixedWidth, double fixedHeight) {
    ATGeometryCanvas canvas = {0};
    if (!(hostWidth > 0 && hostHeight > 0 && isfinite(hostWidth) && isfinite(hostHeight))) { return canvas; }
    canvas.hostOrientation = ATGeometryMeasuredHostOrientation(scene, previousHost, hostWidth, hostHeight);
    canvas.displayOrientation = local || !ATGeometryOrientationIsValid(requestedDisplay)
        ? canvas.hostOrientation : requestedDisplay;
    if (local) {
        // UIKit already rotates this root. Applying another manual transform
        // or using the full screen instead of its viewport causes double rotation.
        canvas.width = hostWidth;
        canvas.height = hostHeight;
        canvas.rotation = 0;
    } else {
        if (!(fixedWidth > 0 && fixedHeight > 0 && isfinite(fixedWidth) && isfinite(fixedHeight))) { return canvas; }
        canvas.width = canvas.displayOrientation >= 3 ? fixedHeight : fixedWidth;
        canvas.height = canvas.displayOrientation >= 3 ? fixedWidth : fixedHeight;
        canvas.rotation = ATGeometryRotation(canvas.displayOrientation) - ATGeometryRotation(canvas.hostOrientation);
    }
    canvas.ready = 1;
    return canvas;
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
