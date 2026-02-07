import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  PublishSuggestionCard,
  ConnectionPrompt,
  PublishPreviewConfluence,
  PublishPreviewJira,
  PublishSuccessMessage,
} from '@/components/guided/publish'

describe('Publish UI Components', () => {
  describe('PublishSuggestionCard', () => {
    const defaultProps = {
      documentType: 'business_rule' as const,
      documentTitle: 'Test BR',
      onPublish: vi.fn(),
      onRemindLater: vi.fn(),
      onDismiss: vi.fn(),
    }

    it('should render suggestion with document title', () => {
      render(<PublishSuggestionCard {...defaultProps} />)
      expect(screen.getByText(/Test BR/)).toBeInTheDocument()
    })

    it('should suggest Confluence for business rules', () => {
      render(<PublishSuggestionCard {...defaultProps} />)
      expect(screen.getByText(/Confluence/)).toBeInTheDocument()
    })

    it('should suggest JIRA for user stories', () => {
      render(<PublishSuggestionCard {...defaultProps} documentType="user_story" />)
      expect(screen.getByText(/JIRA/)).toBeInTheDocument()
    })

    it('should call onPublish when publish clicked', () => {
      render(<PublishSuggestionCard {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /publish/i }))
      expect(defaultProps.onPublish).toHaveBeenCalled()
    })

    it('should call onRemindLater when remind later clicked', () => {
      render(<PublishSuggestionCard {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /later/i }))
      expect(defaultProps.onRemindLater).toHaveBeenCalled()
    })

    it('should call onDismiss when dismiss clicked', () => {
      render(<PublishSuggestionCard {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /no thanks/i }))
      expect(defaultProps.onDismiss).toHaveBeenCalled()
    })
  })

  describe('ConnectionPrompt', () => {
    const defaultProps = {
      onConnect: vi.fn(),
      onSkip: vi.fn(),
    }

    it('should render connect prompt', () => {
      render(<ConnectionPrompt {...defaultProps} />)
      expect(screen.getByText('Connect to Atlassian')).toBeInTheDocument()
    })

    it('should call onConnect when connect clicked', () => {
      render(<ConnectionPrompt {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /connect/i }))
      expect(defaultProps.onConnect).toHaveBeenCalled()
    })

    it('should call onSkip when skip clicked', () => {
      render(<ConnectionPrompt {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /skip|later/i }))
      expect(defaultProps.onSkip).toHaveBeenCalled()
    })
  })

  describe('PublishPreviewConfluence', () => {
    const defaultProps = {
      title: 'Test Page',
      spaceName: 'Dev Space',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      isPublishing: false,
    }

    it('should render Confluence preview with title', () => {
      render(<PublishPreviewConfluence {...defaultProps} />)
      expect(screen.getByText('Test Page')).toBeInTheDocument()
      expect(screen.getByText(/Confluence/)).toBeInTheDocument()
    })

    it('should show space name', () => {
      render(<PublishPreviewConfluence {...defaultProps} />)
      expect(screen.getByText(/Dev Space/)).toBeInTheDocument()
    })

    it('should call onConfirm when publish clicked', () => {
      render(<PublishPreviewConfluence {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /publish/i }))
      expect(defaultProps.onConfirm).toHaveBeenCalled()
    })

    it('should disable button when publishing', () => {
      render(<PublishPreviewConfluence {...defaultProps} isPublishing={true} />)
      expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled()
    })
  })

  describe('PublishPreviewJira', () => {
    const defaultProps = {
      title: 'Test Issue',
      projectName: 'PROJ',
      issueType: 'Story',
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
      isPublishing: false,
    }

    it('should render JIRA preview with title', () => {
      render(<PublishPreviewJira {...defaultProps} />)
      expect(screen.getByText('Test Issue')).toBeInTheDocument()
      expect(screen.getByText('Create JIRA Issue')).toBeInTheDocument()
    })

    it('should show project name', () => {
      render(<PublishPreviewJira {...defaultProps} />)
      expect(screen.getByText('PROJ')).toBeInTheDocument()
    })

    it('should call onConfirm when create clicked', () => {
      render(<PublishPreviewJira {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: /create.*issue/i }))
      expect(defaultProps.onConfirm).toHaveBeenCalled()
    })
  })

  describe('PublishSuccessMessage', () => {
    const defaultProps = {
      platform: 'confluence' as const,
      url: 'https://example.atlassian.net/wiki/page/123',
      title: 'Published Page',
    }

    it('should render success message', () => {
      render(<PublishSuccessMessage {...defaultProps} />)
      expect(screen.getByText(/successfully/i)).toBeInTheDocument()
    })

    it('should show link to published item', () => {
      render(<PublishSuccessMessage {...defaultProps} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', defaultProps.url)
    })

    it('should show Confluence for confluence platform', () => {
      render(<PublishSuccessMessage {...defaultProps} />)
      expect(screen.getByText(/Published successfully to Confluence/)).toBeInTheDocument()
    })

    it('should show JIRA for jira platform', () => {
      render(<PublishSuccessMessage {...defaultProps} platform="jira" />)
      expect(screen.getByText(/Published successfully to JIRA/)).toBeInTheDocument()
    })
  })
})
