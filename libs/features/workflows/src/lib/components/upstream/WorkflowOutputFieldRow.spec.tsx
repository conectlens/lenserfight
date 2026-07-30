import { fireEvent, render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  WORKFLOW_EXPRESSION_DRAG_TYPE,
  WORKFLOW_EXPRESSION_OUTPUT_TYPE_DRAG_TYPE,
} from '../../utils/workflow-expression'

import { WorkflowOutputFieldRow } from './WorkflowOutputFieldRow'

describe('WorkflowOutputFieldRow', () => {
  it('publishes the canonical expression and output type on drag', () => {
    const setData = vi.fn()
    const { container } = render(
      <WorkflowOutputFieldRow
        nodeId="node-abc"
        fieldName="data.summary"
        fieldType="text"
      />,
    )

    fireEvent.dragStart(container.firstElementChild!, {
      dataTransfer: { setData, effectAllowed: 'none' },
    })

    expect(setData).toHaveBeenCalledWith(
      WORKFLOW_EXPRESSION_DRAG_TYPE,
      '[[node-abc.data.summary]]',
    )
    expect(setData).toHaveBeenCalledWith(
      WORKFLOW_EXPRESSION_OUTPUT_TYPE_DRAG_TYPE,
      'text',
    )
    expect(setData).toHaveBeenCalledWith(
      'text/plain',
      '[[node-abc.data.summary]]',
    )
  })
})
