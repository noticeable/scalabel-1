import fs from 'fs-extra'
import _ from 'lodash'
import * as action from '../../js/action/common'
import Session, { dispatch, getState } from '../../js/common/session'
import { Label2DList, makeDrawableLabel2D } from '../../js/drawable/2d/label2d_list'
import { commit2DLabels } from '../../js/drawable/states'
import { makeImageViewerConfig } from '../../js/functional/states'
import { RectType } from '../../js/functional/types'
import { Size2D } from '../../js/math/size2d'
import { Vector2D } from '../../js/math/vector2d'
import { setupTestStore } from '../components/util'

const data = JSON.parse(fs.readFileSync(
  './app/src/test/test_states/sample_state.json', 'utf8'))

beforeEach(() => {
  setupTestStore(data)
})

beforeAll(() => {
  setupTestStore(data)

  Session.images.length = 0
  Session.images.push({ [-1]: new Image(1000, 1000) })
  for (let i = 0; i < getState().task.items.length; i++) {
    dispatch(action.loadItem(i, -1))
  }
  dispatch(action.addViewerConfig(0, makeImageViewerConfig(0)))
  dispatch(action.goToItem(0))
})

test('Add new valid drawable', () => {
  const state = Session.getState()
  expect(_.size(state.task.items[0].labels)).toEqual(3)
  const label2dlist = new Label2DList()
  const label = makeDrawableLabel2D(label2dlist, 'box2d', {})
  expect(label).not.toBeNull()
  if (label) {
    label.initTemp(state, new Vector2D(10, 10))
    // New labels can ignore selected or highlighted property
    // _handleIndex is actually not used, put a random
    label.onMouseDown(new Vector2D(10, 10), 1)
    // Mouse move is essential
    // labelIndex and handleIndex is actually not used here, put a random
    label.onMouseMove(new Vector2D(20, 20), new Size2D(1000, 1000), 1, 2)
    label.onMouseUp(new Vector2D(20, 20))

    commit2DLabels([label], state.task.config.tracking)

    const currentState = Session.getState()
    expect(_.size(currentState.task.items[0].labels)).toEqual(4)
    expect(currentState.task.items[0].labels[label.labelId]).not.toBeUndefined()
    // Shape id is generated by every usage, until it is saved in the states
    // So cannot use original label's shape id to test
    const savedLabel = currentState.task.items[0].labels[label.labelId]
    expect(currentState.task.items[0].shapes[savedLabel.shapes[0]])
      .not.toBeUndefined()
  }
})

test('Add new invalid drawable', () => {
  const state = Session.getState()
  expect(_.size(state.task.items[0].labels)).toEqual(3)
  const label2dlist = new Label2DList()
  const label = makeDrawableLabel2D(label2dlist, 'box2d', {})
  expect(label).not.toBeNull()
  if (label) {
    label.initTemp(state, new Vector2D(10, 10))
    label.onMouseDown(new Vector2D(10, 10), 1)
    // Mouse move is essential
    label.onMouseMove(new Vector2D(12, 12), new Size2D(1000, 1000), 1, 2)
    label.onMouseUp(new Vector2D(12, 12))

    commit2DLabels([label], state.task.config.tracking)

    const currentState = Session.getState()
    expect(_.size(currentState.task.items[0].labels)).toEqual(3)
    expect(currentState.task.items[0].labels[label.labelId]).toBeUndefined()
    expect(_.size(currentState.task.items[0].shapes))
      .toEqual(_.size(state.task.items[0].shapes))
  }
})

test('Update existing drawable', () => {
  const state = Session.getState()
  expect(_.size(state.task.items[0].labels)).toEqual(3)
  // Label coord is [459, 276][752, 400]
  const label2dList = new Label2DList()
  label2dList.updateState(state)
  const label = label2dList.get(1)
  // Existing label must call selected and highlighted property
  label.setSelected(true)
  label.setHighlighted(true, 5) // Handles.BOTTOM_RIGHT
  label.onMouseDown(new Vector2D(752, 400), 1)
  // Mouse move is essential
  label.onMouseMove(new Vector2D(700, 300), new Size2D(1000, 1000), 1, 2)
  label.onMouseUp(new Vector2D(700, 300))

  commit2DLabels([label], state.task.config.tracking)

  const currentState = Session.getState()
  const newLabel = currentState.task.items[0].labels['1']
  const rect = currentState.task.items[0].shapes[newLabel.shapes[0]] as RectType
  expect(rect.x2).toEqual(700)
  expect(rect.y2).toEqual(300)
})

test('Update existing drawable to invalid', () => {
  const state = Session.getState()
  expect(_.size(state.task.items[0].labels)).toEqual(3)
  // Label coord is [459, 276][752, 400]
  const label2dList = new Label2DList()
  label2dList.updateState(state)
  const label = label2dList.get(1)
  expect(label.labelId).toEqual('1')
  // Existing label must call selected and highlighted property
  // This will be handled by Label2DHandler and Label2DCanvas in program
  // In test we do it manually
  label.setSelected(true)
  label.setHighlighted(true, 5) // Handles.BOTTOM_RIGHT
  label.onMouseDown(new Vector2D(752, 400), 1)
  // Mouse move is essential
  label.onMouseMove(new Vector2D(460, 280), new Size2D(1000, 1000), 1, 2)
  label.onMouseUp(new Vector2D(460, 280))

  commit2DLabels([label], state.task.config.tracking)

  const currentState = Session.getState()
  expect(currentState.task.items[0].labels['1']).toBeUndefined()
})
