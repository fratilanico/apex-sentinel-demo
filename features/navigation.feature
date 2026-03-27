Feature: Presentation Navigation
  As a presenter
  I want to navigate through an interactive slide deck
  So that I can deliver the Apex Sentinel story seamlessly

  Background:
    Given the presentation is loaded and at slide index 0

  @positive
  Scenario: Advance to the next slide
    Given the current slide is the introduction
    When I press the "ArrowRight" key
    Then the current slide should update to index 1

  @positive
  Scenario: Return to the previous slide
    Given the presentation is at slide index 2
    When I press the "ArrowLeft" key
    Then the current slide should update to index 1

  @negative
  Scenario: Out of bounds navigation at start
    Given the presentation is at slide index 0
    When I press the "ArrowLeft" key
    Then the current slide should remain at index 0

  @negative
  Scenario: Out of bounds navigation at end
    Given the presentation is at the last slide index
    When I press the "ArrowRight" key
    Then the current slide should remain at the last index
