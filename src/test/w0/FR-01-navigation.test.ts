import { describe, it, expect, beforeEach } from 'vitest'
import { usePresentationStore, SLIDES } from '../../stores/presentationStore'

describe('FR-01: Presentation Navigation', () => {
  beforeEach(() => {
    // Reset store before each test
    usePresentationStore.setState({
      currentSlideId: SLIDES[0].id,
      currentIndex: 0,
      direction: 1
    })
  })

  it('should initialize at the first slide', () => {
    const state = usePresentationStore.getState()
    expect(state.currentIndex).toBe(0)
    expect(state.currentSlideId).toBe(SLIDES[0].id)
  })

  it('should advance to the next slide when goNext is called', () => {
    const { goNext } = usePresentationStore.getState()
    goNext()
    
    const state = usePresentationStore.getState()
    expect(state.currentIndex).toBe(1)
    expect(state.currentSlideId).toBe(SLIDES[1].id)
    expect(state.direction).toBe(1)
  })

  it('should return to the previous slide when goPrev is called', () => {
    const store = usePresentationStore.getState()
    store.goNext()
    store.goNext() // Now at index 2
    
    const updatedStore = usePresentationStore.getState()
    updatedStore.goPrev()
    
    const finalState = usePresentationStore.getState()
    expect(finalState.currentIndex).toBe(1)
    expect(finalState.currentSlideId).toBe(SLIDES[1].id)
    expect(finalState.direction).toBe(-1)
  })

  it('should not advance past the last slide', () => {
    const store = usePresentationStore.getState()
    // Go past the end
    for (let i = 0; i < SLIDES.length + 5; i++) {
      usePresentationStore.getState().goNext()
    }
    
    const state = usePresentationStore.getState()
    expect(state.currentIndex).toBe(SLIDES.length - 1)
    expect(state.currentSlideId).toBe(SLIDES[SLIDES.length - 1].id)
  })

  it('should not go before the first slide', () => {
    const store = usePresentationStore.getState()
    store.goPrev()
    
    const state = usePresentationStore.getState()
    expect(state.currentIndex).toBe(0)
    expect(state.currentSlideId).toBe(SLIDES[0].id)
  })
})
