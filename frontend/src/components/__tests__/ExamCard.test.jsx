/**
 * Unit tests for ExamCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import ExamCard from '../ExamCard'

// Mock the hooks
vi.mock('../../hooks/useCountdown', () => ({
  useCountdown: () => ({
    formatted: '12m 34s',
    remaining: 754,
    expired: false,
  }),
}))

// Mock JoinModal
vi.mock('../JoinModal', () => ({
  default: ({ exam, onClose, onSuccess }) => (
    <div data-testid="join-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={() => onSuccess('ATT-123')}>Start</button>
      <div>{exam.title}</div>
    </div>
  ),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockExam = {
  id: 'EX-101',
  title: 'Test Exam',
  shortDescription: 'This is a test exam description',
  startsAt: new Date(Date.now() + 3600000).toISOString(),
  endsAt: new Date(Date.now() + 7200000).toISOString(),
  durationMin: 60,
  timePerQuestionSec: 30,
  status: 'upcoming',
  attemptsLeft: 2,
  allowedReRecords: 1,
  teacherName: 'Prof. Test',
  pointsTotal: 100,
  thumbnailUrl: null,
  settingsSummary: { strictMode: false },
}

const renderExamCard = (exam = mockExam, props = {}) => {
  return render(
    <BrowserRouter>
      <ExamCard exam={exam} {...props} />
    </BrowserRouter>
  )
}

describe('ExamCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render exam information', () => {
    renderExamCard()

    expect(screen.getByText('Test Exam')).toBeInTheDocument()
    expect(screen.getByText('EX-101')).toBeInTheDocument()
    expect(screen.getByText(/This is a test exam description/)).toBeInTheDocument()
    expect(screen.getByText('Prof. Test')).toBeInTheDocument()
    expect(screen.getByText('100 points')).toBeInTheDocument()
  })

  it('should show correct status badge for live exam', () => {
    const liveExam = {
      ...mockExam,
      status: 'live',
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
    }

    renderExamCard(liveExam)

    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('should show "Join now" button for live exam', () => {
    const liveExam = {
      ...mockExam,
      status: 'live',
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
    }

    renderExamCard(liveExam)

    const button = screen.getByRole('button', { name: /join now/i })
    expect(button).toBeInTheDocument()
  })

  it('should show "View details" button for upcoming exam', () => {
    renderExamCard()

    const button = screen.getByRole('button', { name: /view details/i })
    expect(button).toBeInTheDocument()
  })

  it('should show "View results" button for finished exam', () => {
    const finishedExam = {
      ...mockExam,
      status: 'finished',
      startsAt: new Date(Date.now() - 7200000).toISOString(),
      endsAt: new Date(Date.now() - 3600000).toISOString(),
    }

    renderExamCard(finishedExam)

    const button = screen.getByRole('button', { name: /view results/i })
    expect(button).toBeInTheDocument()
  })

  it('should display countdown for live exam', () => {
    const liveExam = {
      ...mockExam,
      status: 'live',
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
    }

    renderExamCard(liveExam)

    expect(screen.getByText(/Ends in/)).toBeInTheDocument()
  })

  it('should open join modal when "Join now" is clicked', async () => {
    const user = userEvent.setup()
    const liveExam = {
      ...mockExam,
      status: 'live',
      startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
    }

    renderExamCard(liveExam)

    const button = screen.getByRole('button', { name: /join now/i })
    await user.click(button)

    await waitFor(() => {
      expect(screen.getByTestId('join-modal')).toBeInTheDocument()
    })
  })

  it('should call onPrefetch when hovered', async () => {
    const user = userEvent.setup()
    const onPrefetch = vi.fn()

    const { container } = renderExamCard(mockExam, { onPrefetch })
    const card = container.querySelector('article')

    await user.hover(card)

    await waitFor(
      () => {
        expect(onPrefetch).toHaveBeenCalled()
      },
      { timeout: 500 }
    )
  })
})
