import { create } from 'zustand'

export const SLIDES = [
  { id: 'intro', label: 'Mission Briefing' },
  { id: 'landscape', label: 'The Threat Landscape' },
  { id: 'architecture', label: 'Apex Sentinel Core' },
  { id: 'radar', label: 'Live Threat Radar' },
  { id: 'conclusion', label: 'Operational Readiness' },
] as const

export type SlideId = (typeof SLIDES)[number]['id']

interface PresentationState {
  currentSlideId: SlideId
  currentIndex: number
  direction: number
  goNext: () => void
  goPrev: () => void
  goTo: (index: number) => void
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  currentSlideId: SLIDES[0].id,
  currentIndex: 0,
  direction: 1,
  
  goNext: () => {
    const { currentIndex } = get()
    if (currentIndex < SLIDES.length - 1) {
      set({ 
        currentIndex: currentIndex + 1, 
        currentSlideId: SLIDES[currentIndex + 1].id,
        direction: 1 
      })
    }
  },
  
  goPrev: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({ 
        currentIndex: currentIndex - 1, 
        currentSlideId: SLIDES[currentIndex - 1].id,
        direction: -1 
      })
    }
  },
  
  goTo: (index: number) => {
    const { currentIndex } = get()
    if (index >= 0 && index < SLIDES.length && index !== currentIndex) {
      set({ 
        currentIndex: index, 
        currentSlideId: SLIDES[index].id,
        direction: index > currentIndex ? 1 : -1 
      })
    }
  }
}))
