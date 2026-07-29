/*
  ==============================================================================

  BEGIN_JUCE_MODULE_DECLARATION

    ID:                 aka_skeleton
    vendor:             akaieuan
    version:            0.1.0
    name:               akaSkeleton
    description:        Shared design system and widget set for the aka instruments.
    website:            https://akavst.dev
    license:            Proprietary
    minimumCppStandard: 17
    dependencies:       juce_gui_basics, juce_audio_processors

  END_JUCE_MODULE_DECLARATION

  ==============================================================================
*/

#pragma once

/**
    akaSkeleton — the parts of an aka instrument that are not the instrument.

    Palette, LookAndFeel and widgets, shared so a new plugin starts at the house
    standard instead of arriving at a fourth interpretation of it. The colours
    are generated from the same source as the website's stylesheet
    (`web/src/design/tokens.ts`), so the plugins and the site cannot drift.

    Lives in the akaVST repository. Consume it the way JUCE itself is consumed —
    FetchContent with a pinned tag, pulling one directory out of it:

        FetchContent_Declare(akaVST
            GIT_REPOSITORY https://github.com/akaieuan/akaVST.git
            GIT_TAG skeleton-v0.1.0
            GIT_SUBMODULES ""
            SOURCE_SUBDIR skeleton)
        FetchContent_MakeAvailable(akaVST)

        target_link_libraries(YourPlugin PRIVATE aka_skeleton)

    GIT_SUBMODULES "" matters: without it CMake initialises akaVST's submodules
    and the fetch drags in bleep, enzyme and i4 — including whichever one is
    doing the fetching.

    Then pick an accent once, in your editor's constructor, and never spend
    another. That is the house rule the site enforces too: one instrument, one
    accent, spent on the thing that matters.

        aka::LookAndFeel::setAccent (aka::accentRose);
*/

#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_audio_processors/juce_audio_processors.h>

#include "theme/Tokens.h"
#include "theme/Theme.h"
#include "theme/LookAndFeel.h"
#include "widgets/Knob.h"
