/**
 * Unit tests for JoinModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import JoinModal from '../JoinModal'
import * as api from '../../services/api'

// Mock the API
vi.mock('../../services/api', () => ({
  startExam: vi.fn(),
}))

const mockExam = {
  id: 'EX-101',
  title: 'Test Exam',
  shortDescription: 'Test description',
  startsAt: new Date(Date.now() + 3600000).toISOString(),
  endsAt: new Date(Date.now() + 7200000).toISOString(),
  durationMin: 60,
  timePerQuestionSec: 30,
  status: 'live',
  attemptsLeft: 2,
  allowedReRecords: 1,
  teacherName: 'Prof. Test',
  pointsTotal: 100,
  thumbnailUrl: null,
  settingsSummary: { strictMode: false },
}

describe('JoinModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render exam information', () => {
    render(<JoinModal exam={mockExam} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    expect(screen.getByText('Start Exam')).toBeInTheDocument()
    expect(screen.getByText('Test Exam')).toBeInTheDocument()
    expect(screen.getByText(/Time allowed:/)).toBeInTheDocument()
    expect(screen.getByText(/Attempts left:/)).toBeInTheDocument()
  })

  it('should call startExam when Start Exam is clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(api.startExam).mockResolvedValue({
      attemptId: 'ATT-123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      firstQuestionId: 'Q1',
    })

    render(<JoinModal exam={mockExam} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const startButton = screen.getByRole('button', { name: /start exam/i })
    await user.click(startButton)

    await waitFor(() => {
      expect(api.startExam).toHaveBeenCalledWith('EX-101')
    })
  })

  it('should call onSuccess with attemptId when start succeeds', async () => {
    const user = userEvent.setup()
    vi.mocked(api.startExam).mockResolvedValue({
      attemptId: 'ATT-123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      firstQuestionId: 'Q1',
    })

    render(<JoinModal exam={mockExam} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const startButton = screen.getByRole('button', { name: /start exam/i })
    await user.click(startButton)

    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalledWith('ATT-123')
      },
      { timeout: 1000 }
    )
  })

  it('should display error message when start fails', async () => {
    const user = userEvent.setup()
    vi.mocked(api.startExam).mockRejectedValue({
      status: 400,
      error: 'attempts_exhausted',
      message: 'You have no attempts left for this exam.',
    })

    render(<JoinModal exam={mockExam} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const startButton = screen.getByRole('button', { name: /start exam/i })
    await user.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/You have no attempts left/)).toBeInTheDocument()
    })
  })

  it('should close modal when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<JoinModal exam={mockExam} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should close modal when Escape key is pressed', async () => {
    const user = userEvent.setup()
    render(<JoinModal exam={mockExam} onClose={mockOnClose} onSuccess={mockOnSuccess} />)

    await user.keyboard('{Escape}')

    expect(mockOnClose).toHaveBeenCalled()
  })
})





