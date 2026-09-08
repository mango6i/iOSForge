TARGET = iphone:clang:latest:15.0
ARCHS = arm64 arm64e

include $(THEOS)/makefiles/common.mk

TWEAK_NAME = HelloiOSForge

HelloiOSForge_FILES = Tweak.xm
HelloiOSForge_CFLAGS = -fobjc-arc
HelloiOSForge_FRAMEWORKS = UIKit
HelloiOSForge_PACKAGE_SCHEME = rootless

include $(THEOS_MAKE_PATH)/tweak.mk

after-install::
	install.exec "killall -9 SpringBoard"
