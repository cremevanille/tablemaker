const table = document.getElementById('table-container')
const classes = document.getElementById('classes')

const editClass = () => {}

function* range(start, end=null, step=1) { 
  if (end === null) for (let i=0; i<start; i+=step) yield i 
  else for (let i=start; i<end; i+=step) yield i
}

const rowCount = () => table.querySelectorAll('tr').length
const colCount = () => rowCells(table.querySelector('tr')).reduce((n, c) => n+c.colSpan, 0)

const cells = () => [...table.querySelectorAll('td, th')]
const rows = () => [...table.querySelectorAll('tr')]
const rowCells = (row) => [...row.querySelectorAll('td, th')]

const rowIndex = (cell) => {
  return rows().findIndex(r => r === cell.parentElement)
}
const colIndexCache = new Map()
const colIndex = (cell) => {
  const cache = colIndexCache.get(cell)
  if (cache !== undefined) return cache

  const emptyIndices = []
  const i = rowIndex(cell);
  rows().forEach((row, ii) => {
    if (ii >= i) return
    rowCells(row).forEach(c => {
      if (c.rowSpan <= i-ii) return
      const jj = colIndex(c)
      for (const k of Array(c.colSpan).keys())
        emptyIndices.push(jj+k)
    })
  })
  let j=0
  for (const c of cell.parentElement.querySelectorAll('td, th')) {
    while (emptyIndices.includes(j)) j++
    if (c === cell) break
    j += c.colSpan
  }
  colIndexCache.set(cell, j)
  return j
}

const rowHasTopBorder = (i, firstCol, lastCol) => {
  let min = i
  for (const [ri, r] of rows().entries()) {
    if (ri >= i) break
    const imax = Math.max(...rowCells(r).map(c => firstCol<=colIndex(c)+c.colSpan-1 && colIndex(c)<=lastCol ? ri+c.rowSpan-1 : 0))
    if (imax >= i && ri < min) min = ri
  }
  return min === i
}
const rowHasBottomBorder = (i, firstCol, lastCol) => {
  let max = i
  for (const [ri, r] of rows().entries()) {
    if (ri > i) break
    const imax = Math.max(...rowCells(r).map(c => firstCol<=colIndex(c)+c.colSpan-1 && colIndex(c)<=lastCol ? ri+c.rowSpan-1 : 0))
    if (imax > max) max = imax
  }
  return max === i
}
const colHasLeftBorder = (j, firstRow, lastRow) => {
  let min = j
  for (const [ri, r] of rows().entries()) {
    for (const c of rowCells(r)) {
      const cj = colIndex(c)
      if (firstRow > ri+c.rowSpan-1 || ri > lastRow) continue
      if (cj >= j) break
      if (cj+c.colSpan > j && cj < min) min = cj
    }
  }
  return min === j
}
const colHasRightBorder = (j, firstRow, lastRow) => {
  let max = j
  for (const [ri, r] of rows().entries()) {
    for (const c of rowCells(r)) {
      const cj = colIndex(c)
      if (firstRow > ri+c.rowSpan-1 || ri > lastRow) continue
      if (cj > j) break
      if (cj+c.colSpan-1 > max) max = cj+c.colSpan-1
    }
  }
  return max === j
}

const topBorder =    (i, firstCol, lastCol) => [...range(i+1)].findLast(ii => rowHasTopBorder(ii, firstCol, lastCol))
const leftBorder =   (j, firstRow, lastRow) => [...range(j+1)].findLast(jj => colHasLeftBorder(jj, firstRow, lastRow))
const bottomBorder = (i, firstCol, lastCol) => [...range(i, rowCount())].find(ii => rowHasBottomBorder(ii, firstCol, lastCol))
const rightBorder =  (j, firstRow, lastRow) => [...range(j, colCount())].find(jj => colHasRightBorder(jj, firstRow, lastRow))

const actions = []
const selections = {
  list: [],
  forEach(callback) { this.list.forEach(callback) },
  last() { return this.list?.[this.list.length-1] },
  clear() { 
    while(this.list.length) this.list[0].delete()
    actions.forEach(a => { a.element.disabled = !a.condition() })
  },
  any() { return !!this.list.length },
  update() {
    classes.querySelectorAll('.class-item').forEach(ci => ci.remove())
    if (!this.any()) return
    const classList = [...this.last().cells[0].classList]
    classList.filter(cl => this.list.every(s => s.cells.every(c => c.classList.contains(cl)))).forEach(cl => {
      const editButton = document.createElement('BUTTON')
      editButton.textContent = cl

      const deleteButton = document.createElement('BUTTON')
      deleteButton.textContent = '×'

      const container = document.createElement('DIV')
      container.classList.add('class-item')
      container.appendChild(editButton)
      container.appendChild(deleteButton)
      classes.appendChild(container)

      editButton.addEventListener('click', editClass)
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation()
        this.forEach(s => s.cells.forEach(c => c.classList.remove(cl)))
        container.remove()
      })
    })
    if (this.list.every(s => s.cells.every(c => c.tagName === 'TH'))) {
      const editButton = document.createElement('BUTTON')
      editButton.textContent = 'th'

      const deleteButton = document.createElement('BUTTON')
      deleteButton.textContent = '×'

      const container = document.createElement('DIV')
      container.classList.add('class-item')
      container.classList.add('class-th')
      container.appendChild(editButton)
      container.appendChild(deleteButton)
      classes.firstElementChild.insertAdjacentElement('afterend', container)

      editButton.addEventListener('click', editClass)
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation()
        this.forEach(s => s.cells.forEach(c => {
          const newCell = createCell('TD')
          newCell.textContent = c.textContent
          c.parentElement.replaceChild(newCell, c)
        }))
        container.remove()
      })
    }
  }
}

class Selection {
  constructor() {
    selections.list.push(this)
    this.element = document.createElement('DIV')
    this.element.classList.add('selection')
    table.prepend(this.element)

    this.ongoing = false
    this.start = null
    this.end = null
    this.firstRow = null
    this.firstCol = null
    this.lastRow = null
    this.lastCol = null
    this.cells = []
  }
  update() {
    if (this.start === this.end) {
      this.firstRow = rowIndex(this.start)
      this.lastRow  = this.firstRow + this.start.rowSpan - 1
      this.firstCol = colIndex(this.start)
      this.lastCol  = this.firstCol + this.start.colSpan - 1
    } else {
      const si = rowIndex(this.start)
      const sj = colIndex(this.start)
      const ei = rowIndex(this.end)
      const ej = colIndex(this.end)

      const mini = Math.min(si, ei)
      const minj = Math.min(sj, ej)
      const maxi = Math.max(si + this.start.rowSpan, ei + this.end.rowSpan) - 1
      const maxj = Math.max(sj + this.start.colSpan, ej + this.end.colSpan) - 1

      let nextFirstRow, nextFirstCol, nextLastRow, nextLastCol
      while (
            this.firstRow != (nextFirstRow = topBorder(mini, nextFirstCol, nextLastCol)) 
        || this.firstCol != (nextFirstCol = leftBorder(minj, nextFirstRow, nextLastRow))
        || this.lastRow  != (nextLastRow  = bottomBorder(maxi, nextFirstCol, nextLastCol))
        || this.lastCol  != (nextLastCol  = rightBorder(maxj, nextFirstRow, nextLastRow))
      ) {
        this.firstRow = nextFirstRow
        this.firstCol = nextFirstCol
        this.lastRow  = nextLastRow
        this.lastCol  = nextLastCol
      }
    }
    this.cells = rows().reduce(
      (cs, r, ri) => cs.concat(this.firstRow<=ri && ri<=this.lastRow
        ? rowCells(r).filter(c => this.firstCol<=colIndex(c) && colIndex(c)<=this.lastCol)
        : []
      ), []
    )

    this.element.style.left    = `${this.firstCol*3-.20}rem`
    this.element.style.top     = `${this.firstRow*2-.20}rem`
    this.element.style.width   = `${(this.lastCol-this.firstCol+1)*3}rem`
    this.element.style.height  = `${(this.lastRow-this.firstRow+1)*2}rem`

    actions.forEach(a => { a.element.disabled = !a.condition() })
    selections.update()
  }
  delete() {
    this.element.remove()
    selections.list.splice(selections.list.indexOf(this), 1)
    actions.forEach(a => a.element.disabled = !a.condition())
  }
}

const setCellListeners = (cell) => {
  cell.addEventListener('mousedown', (e) => {
    e.stopPropagation()
    if (e.shiftKey) {
      if (!selections.any() || e.metaKey) {
        const selection = selections.list.find(s => s.start === cell)
        if (selection) {
          selection.delete()
          selections.update()
          return
        }
        cell.contentEditable = false
      } else {
        selections.clear()
      }

      const selection = new Selection()
      selection.ongoing = true
      selection.start = cell
      selection.end = cell
      selection.update()
    } else {
      selections.clear()
      cell.contentEditable = true
      cell.focus()
    }
  })
  cell.addEventListener('mouseenter', (e) => {
    if (!e.shiftKey) return
    if (!selections.any()) return
    const selection = selections.last()
    if (!selection.ongoing) return
    selection.end = cell
    selection.update()
  })
  cell.addEventListener('blur', () => {
    cell.contentEditable = false
  })
}
cells().forEach(setCellListeners)

document.addEventListener('mouseup', () => {
  if (!selections.any()) return
  selections.last().ongoing = false
})
document.addEventListener('click', (e) => {
  if (table.contains(e.target)) return
  selections.clear()
})

let dummy = 9
const createCell = (tag) => {
  const cell = document.createElement(tag)
  cell.innerText = String(dummy++)
  setCellListeners(cell)
  return cell
}

const insertRow = (i) => {
  const newRow = document.createElement('tr')
  for (let j=0; j<colCount(); j++) {
    const newCell = createCell('td')
    newRow.appendChild(newCell)
  }
  const allRows = rows()
  if (i < allRows.length) {
    const row = allRows[i]
    row.insertAdjacentElement('beforebegin', newRow)
  } else {
    allRows[allRows.length-1].insertAdjacentElement('afterend', newRow)
  }
}
const insertColumn = (j) => {
  rows().forEach((row, i) => {
    const cellAfter = rowCells(row).find(c => colIndex(c) >= j)
    if (cellAfter)
      cellAfter.insertAdjacentElement('beforebegin', createCell('td'))
    else
      row.appendChild(createCell('td'))
  })
}

actions.push({
  element: document.getElementById('add-row-before'),
  condition() { return selections.any() },
  modKey: 'Meta',
  key: 75,
  callback(e) {
    if (e) e.stopPropagation()
    selections.forEach(s => {
      insertRow(s.firstRow)
      colIndexCache.clear()
      selections.forEach(ss => ss.update())
    })
  }
})

actions.push({
  element: document.getElementById('add-row-after'),
  condition() { return selections.any() },
  modKey: 'Meta',
  key: 74,
  callback(e) {
    if (e) e.stopPropagation()
    selections.forEach(s => {
      insertRow(s.lastRow+1)
      colIndexCache.clear()
      selections.forEach(ss => ss.update())
    })
  }
})

actions.push({
  element: document.getElementById('add-col-before'),
  condition() { return selections.any() },
  modKey: 'Meta',
  key: 72,
  callback(e) {
    if (e) e.stopPropagation()
    selections.forEach(s => {
      insertColumn(s.firstCol)
      colIndexCache.clear()
      selections.forEach(ss => ss.update())
    })
  }
})

actions.push({
  element: document.getElementById('add-col-after'),
  condition() { return selections.any() },
  modKey: 'Meta',
  key: 76,
  callback(e) {
    if (e) e.stopPropagation()
    selections.forEach(s => {
      insertColumn(s.lastCol+1)
      colIndexCache.clear()
      selections.forEach(ss => ss.update())
    })
  }
})

actions.push({
  element: document.getElementById('delete-row'),
  condition() { return selections.any() },
  modKey: null,
  key: 8,
  callback(e) {
    if (e) e.stopPropagation()
    selections.forEach(s => {
      const deletedRows = rows().filter((r, ri) => s.firstRow <= ri && ri <= s.lastRow)
      deletedRows.forEach(r => r.remove())
    })
    selections.clear()
  }
})

actions.push({
  element: document.getElementById('delete-col'),
  condition() { return selections.any() },
  modKey: 'Meta',
  key: 8,
  callback(e) {  
    if (e) e.stopPropagation()
    const deletedCells = new Set()
    cells().forEach(c => {
      selections.forEach(s => {
        const j = colIndex(c)
        if (s.firstCol <= j && j <= s.lastCol) deletedCells.add(c)
      })
    })
    Array.from(deletedCells).forEach(c => c.remove())
    colIndexCache.clear()
    selections.clear()
  }
})

actions.push({
  element: document.getElementById('merge-button'),
  condition() { return selections.list.length === 1 && selections.last().start !== selections.last().end },
  modKey: 'Meta',
  key: 77,  
  callback(e) {
    if (e) e.stopPropagation()
    const selection = selections.last()

    const mergedCells = cells().filter(c=> {
      const i = rowIndex(c)
      const j = colIndex(c)
      return (selection.firstRow <= i && i <= selection.lastRow
          && selection.firstCol <= j && j <= selection.lastCol)
    })
    mergedCells[0].setAttribute('rowspan', selection.lastRow-selection.firstRow+1)
    mergedCells[0].setAttribute('colspan', selection.lastCol-selection.firstCol+1)
    mergedCells.slice(1).forEach(c => c.remove())
    colIndexCache.clear()

    selection.end = selection.start
    selection.update()
  }
})

const unmergeCell = (cell) => {
  if (cell.rowSpan===1 && cell.colSpan===1) return
  for (const _ of Array(cell.colSpan-1)) {
    cell.insertAdjacentElement('afterend', createCell(cell.tagName))
  }

  const j = colIndex(cell)
  let row = cell.parentElement
  if (j === 0) {
    for (const _ of Array(cell.rowSpan-1)) {
      row = row.nextElementSibling
      const firstCell = row.firstElementChild
      if (firstCell) {
        for (const _ of Array(cell.colSpan))
          firstCell.insertAdjacentElement('beforebegin', createCell(cell.tagName))
      } else {
        for (const _ of Array(cell.colSpan))
          row.appendChild(createCell(cell.tagName))
      }
    }
  } else {
    const cellsBefore = []
    for (const _ of Array(cell.rowSpan-1)) {
      row = row.nextElementSibling
      const cellBefore = rowCells(row).findLast(c => colIndex(c) <= j)
      if (cellBefore) {
        for (const _ of Array(cell.colSpan))
          cellsBefore.push(cellBefore)
      } else {
        for (const _ of Array(cell.colSpan))
          row.appendChild(createCell(cell.tagName))
      }
    }
    cellsBefore.forEach(c => { c.insertAdjacentElement('afterend', createCell(cell.tagName)) })
  }
  cell.rowSpan = 1
  cell.colSpan = 1
}
actions.push({
  element: document.getElementById('unmerge-button'),
  condition() { return selections.any() && selections.list.some(s => s.cells.some(c => c.rowSpan!=1 || c.colSpan!=1)) },
  modKey: 'Meta',
  key: 85,  
  callback(e) {  
    if (e) e.stopPropagation()
    selections.forEach(s => s.cells.forEach(unmergeCell))
    colIndexCache.clear()
  }
})

const addClassButton = document.getElementById('add-class')
const classInput = document.getElementById('class-button')
const stopClassEdition = () => {
  classInput.textContent = 'addClass'
  classInput.blur()
  addClassButton.hidden = true
  initAction(classAction)
  selections.update()
  document.removeEventListener('keydown', addClass)
  classAction.element.removeEventListener('blur', stopClassEdition)
  actions.forEach(a => a.element.disabled = !a.condition())
}
const addClass = (e) => {
  if (e instanceof KeyboardEvent && e.keyCode !== 13) return
  if (e instanceof PointerEvent) e.stopPropagation()
  const className = classInput.textContent
  if (className === 'th' | className === 'TH') {
    selections.forEach(s => s.cells.forEach((c, ci) => {
      const newCell = createCell('TH')
      newCell.textContent = c.textContent
      newCell.classList = c.classList
      c.parentElement.replaceChild(newCell, c)
      s.cells[ci] = newCell
    }))
  } else {
    selections.forEach(s => s.cells.forEach(c => c.classList.add(className)))
  }
  stopClassEdition()
}
addClassButton.addEventListener('click', addClass)
const classAction = {
  element: classInput,
  condition() { return selections.any() },
  modKey: 'Meta',
  key: 67,
  callback(e) {
    if (e) e.stopPropagation()
    classAction.element.removeEventListener('click', classAction.callback)

    actions.forEach(a => { if (a !== classAction) a.element.disabled = true })
    classAction.element.textContent = ''
    classAction.element.contentEditable = true
    classAction.element.focus()
    addClassButton.hidden = false
    document.addEventListener('keydown', addClass)
    classAction.element.addEventListener('blur', stopClassEdition)
  }
}
actions.push(classAction)

const initAction = a => {
  a.element.addEventListener('click', a.callback)
  let modKey = ''
  switch (a.modKey) {
    case 'Meta':    modKey = '⌘'; break;
    case 'Shift':   modKey = '⇧'; break;
    case 'Alt':     modKey = '⌥'; break;
    case 'Control': modKey = '⌃'; break;
  }
  let key = ''
  switch (a.key) {
    case 37: key = '←'; break;
    case 38: key = '↑'; break;
    case 39: key = '→'; break;
    case 40: key = '↓'; break;
    case 8:  key = '⌫'; break;
    default: key = String.fromCharCode(a.key)
  }
  const span = document.createElement('SPAN')
  span.classList.add('key')
  span.textContent = modKey + key
  a.element.appendChild(span)
}
actions.forEach(initAction)


document.addEventListener('keydown', e => {
  actions.forEach(a => {
    if (a.element.disabled) return
    if (
      (
           a.modKey 
        && e.getModifierState(a.modKey) 
        && e.keyCode === a.key
      ) || (
           !a.modKey 
        && !e.getModifierState('Meta')
        && !e.getModifierState('Shift')
        && !e.getModifierState('Alt')
        && !e.getModifierState('Control')
        && e.keyCode === a.key
      )
    ) {
      e.preventDefault()
      a.callback()
    }
  })
})