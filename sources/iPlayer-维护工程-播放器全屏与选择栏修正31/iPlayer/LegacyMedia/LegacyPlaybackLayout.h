// Shared layout calculations, used by UIKit and portable geometry checks.
#ifndef LEGACY_PLAYBACK_LAYOUT_H
#define LEGACY_PLAYBACK_LAYOUT_H
#include <stdbool.h>
#include <math.h>

typedef struct { double top,left,bottom,right; } LMLayoutInsets;
typedef struct {
    double canvasWidth,canvasHeight,centerX,centerY,rotation;
    double listY,listHeight;
    double controlLeft,controlRight,controlTop,controlBottom;
} LMPlaybackGeometry;

static inline LMPlaybackGeometry LMPlaybackGeometryMake(double width,double height,LMLayoutInsets safe,bool full,bool vertical) {
    LMPlaybackGeometry g={0};
    width=fmax(0,width);height=fmax(0,height);
    g.centerX=width/2;
    if(full){
        g.centerY=height/2;
        if(height>width&&!vertical){
            // A portrait-locked window still gets a landscape playback canvas.
            // UIKit transforms also rotate hit testing for its controls.
            g.canvasWidth=height;g.canvasHeight=width;g.rotation=1.5707963267948966;
            g.controlLeft=safe.top;g.controlRight=safe.bottom;
            g.controlTop=safe.right;g.controlBottom=safe.left;
        }else{
            g.canvasWidth=width;g.canvasHeight=height;
            g.controlLeft=safe.left;g.controlRight=safe.right;
            g.controlTop=safe.top;g.controlBottom=safe.bottom;
        }
    }else{
        g.canvasWidth=width;
        g.canvasHeight=fmin(width*9/16,fmax(0,height-safe.top-safe.bottom-190));
        g.centerY=safe.top+g.canvasHeight/2;
        g.listY=safe.top+g.canvasHeight+30;
        g.listHeight=fmax(0,height-g.listY-safe.bottom);
    }
    return g;
}

typedef struct { double barY,barHeight,contentHeight,buttonHeight; } LMSelectionGeometry;
static inline LMSelectionGeometry LMSelectionGeometryMake(double height,double windowSafeBottom,bool selecting) {
    LMSelectionGeometry g={height,0,height,0};
    if(selecting){
        double inset=fmax(0,height-windowSafeBottom);
        g.buttonHeight=fmin(52,fmax(0,height-inset));
        g.barHeight=inset+g.buttonHeight;
        g.barY=fmax(0,height-g.barHeight);g.contentHeight=g.barY;
    }
    return g;
}
#endif
