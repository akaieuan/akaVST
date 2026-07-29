cmake_minimum_required(VERSION 3.22)
# C as well as C++: JUCE ships C sources (image codecs among others), and a
# CXX-only project fails at generate with a missing CMAKE_C_COMPILE_OBJECT.
project(akaSkeleton VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Consumers normally bring their own JUCE — every aka plugin already fetches it
# and would end up with two copies otherwise. Only fetch when configured
# standalone, which is how the compile check below runs.
if(NOT TARGET juce::juce_gui_basics)
    include(FetchContent)
    FetchContent_Declare(
        JUCE
        GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
        GIT_TAG 8.0.4
        GIT_SHALLOW TRUE
    )
    FetchContent_MakeAvailable(JUCE)
endif()

juce_add_module(${CMAKE_CURRENT_SOURCE_DIR}/modules/aka_skeleton ALIAS_NAMESPACE aka)

# A target that compiles the module and nothing else, so `cmake --build . ` is a
# real check rather than a configure-time no-op. Consumers ignore this.
add_library(aka_skeleton_compile_check STATIC
    ${CMAKE_CURRENT_SOURCE_DIR}/modules/aka_skeleton/aka_skeleton.cpp)

target_link_libraries(aka_skeleton_compile_check
    PRIVATE
        aka_skeleton
        juce::juce_gui_basics
        juce::juce_audio_processors
    PUBLIC
        juce::juce_recommended_config_flags
        juce::juce_recommended_warning_flags)

target_compile_definitions(aka_skeleton_compile_check PRIVATE
    JUCE_WEB_BROWSER=0
    JUCE_USE_CURL=0
    JUCE_STANDALONE_APPLICATION=0
    JUCE_MODULE_AVAILABLE_aka_skeleton=1)
