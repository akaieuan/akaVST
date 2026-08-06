cmake_minimum_required(VERSION 3.22)
project(akaPlayer VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0" CACHE STRING "")
set(CMAKE_OSX_ARCHITECTURES "arm64;x86_64" CACHE STRING "Build universal (arm64 + x86_64)")

include(FetchContent)
FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.4
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(JUCE)

# Same two ways in as the three instruments: local checkout when it sits beside
# this one, pinned tag when cloned alone.
set(AKA_SKELETON_LOCAL "${CMAKE_CURRENT_SOURCE_DIR}/../skeleton")
if (EXISTS "${AKA_SKELETON_LOCAL}/CMakeLists.txt")
    message(STATUS "akaSkeleton: local checkout at ${AKA_SKELETON_LOCAL}")
    add_subdirectory("${AKA_SKELETON_LOCAL}" "${CMAKE_BINARY_DIR}/aka_skeleton")
else()
    message(FATAL_ERROR "akaPlayer currently requires the akaVST checkout around it.")
endif()

juce_add_plugin(akaPlayer
    COMPANY_NAME "akaieuan"
    BUNDLE_ID "com.akaieuan.akaplayer"
    PLUGIN_MANUFACTURER_CODE Akeu
    PLUGIN_CODE Akpl
    FORMATS VST3 AU Standalone
    PRODUCT_NAME "akaVST Player"
    IS_SYNTH TRUE
    NEEDS_MIDI_INPUT TRUE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD TRUE
    VST3_CATEGORIES Instrument Synth
    AU_MAIN_TYPE kAudioUnitType_MusicDevice
)

target_sources(akaPlayer PRIVATE
    source/PluginProcessor.cpp
    source/PluginEditor.cpp
)

# ---------------------------------------------------------------------------
# The engine, as a header-only include path rather than part of the JUCE module.
#
# `dsp/` is deliberately not in aka_skeleton.h. Putting it there would compile
# fifty-four engines into bleep, enzyme and i4 as well, none of which use them,
# and would drag a directory whose whole rule is "no JUCE" inside a JUCE module.
# It is header-only, so an include path is the entire integration — and the same
# headers Emscripten compiles for Socket are the ones AppleClang compiles here,
# which is the property the shared engine exists to have.
# ---------------------------------------------------------------------------
target_include_directories(akaPlayer PRIVATE
    "${AKA_SKELETON_LOCAL}/modules/aka_skeleton/dsp"
)

target_compile_definitions(akaPlayer PRIVATE
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_DISPLAY_SPLASH_SCREEN=0
)

target_link_libraries(akaPlayer PRIVATE
    aka::aka_skeleton
    juce::juce_audio_utils
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags
)

# ---------------------------------------------------------------------------
# render — a console host that plays a note through the built plugin and
# measures it. auval proves the plugin does not crash; this proves it makes the
# right sound, and it is the half of Phase 2's comparison that runs on this
# side. Not part of the default build: `cmake --build build --target render`.
# ---------------------------------------------------------------------------
juce_add_console_app(render PRODUCT_NAME "aka-render")

target_sources(render PRIVATE tools/render.cpp)

target_compile_definitions(render PRIVATE
    JUCE_PLUGINHOST_VST3=1
    JUCE_PLUGINHOST_AU=0
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_MODAL_LOOPS_PERMITTED=1
)

target_link_libraries(render PRIVATE
    juce::juce_audio_processors
    juce::juce_audio_utils
    PUBLIC
        juce::juce_recommended_config_flags
)

set_target_properties(render PROPERTIES EXCLUDE_FROM_ALL TRUE)
