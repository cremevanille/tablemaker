import css from './style.js'

// UTILS
function range(start, end=undefined, step=1) {
  return end !== undefined
    ? Array(end-start).fill().map((_,k) => start+k)
    : Array(start).fill().map((_,k) => k)
}

Object.defineProperties(Array.prototype, {
  max: {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function(lessThan = (x,y)=>x<y) {
      let max = this?.[0]
      this.forEach(x => { if (lessThan(max, x)) max=x })
      return max
    }
  },
  min: {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function(lessThan = (x,y)=>x<y) {
      let min = this?.[0]
      this.forEach(x => { if (lessThan(x, min)) min=x })
      return min
    }
  },
  minmax: {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function(lessThan = (x,y)=>x<y) {
      let min=this?.[0], max=this?.[0]
      this.forEach(x => {
        if (lessThan(max, x)) max=x
        if (lessThan(x, min)) min=x
      })
      return [min, max]
    }
  },
  insertSort: {
    configurable: true,
    enumerable: false,
    writable: true,
    value: function(y, lessThan = (x,y)=>x<y) {
      const i = this.findIndex(x => lessThan(y, x))
      if (i == -1) this.push(y)
      else this.splice(i, 0, y)
      return this
    }
  },
})

const classes = document.getElementById('classes')
const table = document.getElementById('table-container')
const newClassInput = document.getElementById('class-input')
const newClassContainer = newClassInput.parentElement
const editClassContainer = document.getElementById('edit-class')

const cache = {
  rows: undefined,
  rowCells: new Map(),
  rowCount: undefined,
  colCount: undefined,
  rowIndex: new Map(),
  colIndex: new Map(),
  clear(...props) {
    props.forEach(prop => {
      if (cache[prop] instanceof Map) cache[prop].clear()
      else cache[prop] = undefined
    })
  }
}
const rows = () => (
  cache.rows ?? (cache.rows = [...table.querySelectorAll('tr')])
)
const rowCells = (row) => {
  const ca = cache.rowCells.get(row)
  if (ca !== undefined) return ca

  const cells = [...row.querySelectorAll('td, th')]
  cache.rowCells.set(row, cells)
  return cells
}
const cells = function*() {
  for (const row of rows()) for (const cell of rowCells(row)) yield cell
}
const rowCount = () => (
  cache.rowCount ?? (cache.rowCount = rows().length)
)
const colCount = () => (
  cache.colCount ?? (cache.colCount = rowCells(rows()[0]).reduce((n, c) => n+c.colSpan, 0))
)
const rowIndex = (cell) => {
  const ca = cache.rowIndex.get(cell)
  if (ca !== undefined) return ca

  const i = rows().findIndex(r => r === cell.parentElement)
  cache.rowIndex.set(cell, i)
  return i
}

rows()[0].childNodes

const colIndex = (cell) => {
  const ca = cache.colIndex.get(cell)
  if (ca !== undefined) return ca

  const emptyIndices = []
  const i = rowIndex(cell);
  rows().slice(0, i).forEach((r, ri) => {
    rowCells(r)
      .filter(c => ri+c.rowSpan-1 >= i)
      .forEach(c => { emptyIndices.push(...range(c.colSpan).map(k => colIndex(c)+k)) })
  })
  let j = 0
  for (const c of rowCells(cell.parentElement)) {
    while (emptyIndices.includes(j)) j++
    if (c === cell) break
    j += c.colSpan
  }

  cache.colIndex.set(cell, j)
  return j
}

const rowHasTopBorder = (i, firstCol, lastCol) => (
  rows()
    .slice(0, i)
    .map((r, ri) => (
      rowCells(r)
        .filter(c => firstCol <= colIndex(c)+c.colSpan-1 && colIndex(c) <= lastCol)
        .map(c => ri+c.rowSpan-1)
        .max() ?? 0
    ))
    .findIndex(imax => imax >= i) == -1
)
const colHasLeftBorder = (j, firstRow, lastRow) => (
  rows()
    .map((r, ri) => (
      rowCells(r)
        .filter(c => firstRow <= ri+c.rowSpan-1 && ri <= lastRow && colIndex(c) < j && j <= colIndex(c)+c.colSpan-1)
        .map(colIndex)
        .min() ?? j
    ))
    .min() >= j
)
const rowHasBottomBorder = (i, firstCol, lastCol) => (
  rows()
    .slice(0, i+1)
    .map((r, ri) => (
      rowCells(r)
        .filter(c => firstCol <= colIndex(c)+c.colSpan-1 && colIndex(c) <= lastCol)
        .map(c => ri+c.rowSpan-1)
        .max() ?? ri
    ))
    .max() <= i
)
const colHasRightBorder = (j, firstRow, lastRow) => {
  return rows()
    .map((r, ri) => (
      rowCells(r)
        .filter(c => firstRow <= ri+c.rowSpan-1 && ri <= lastRow && colIndex(c) <= j)
        .map(c => colIndex(c)+c.colSpan-1)
        .max() ?? j
    ))
    .max() <= j
}
const topBorder = (i, firstCol, lastCol) => (
  range(i+1).findLast(ii => rowHasTopBorder(ii, firstCol, lastCol))
)
const leftBorder = (j, firstRow, lastRow) => (
  range(j+1).findLast(jj => colHasLeftBorder(jj, firstRow, lastRow))
)
const bottomBorder = (i, firstCol, lastCol) => (
  range(i, rowCount()).find(ii => rowHasBottomBorder(ii, firstCol, lastCol))
)
const rightBorder = (j, firstRow, lastRow) => (
  range(j, colCount()).find(jj => colHasRightBorder(jj, firstRow, lastRow))
)
const cellComp = (c1, c2) => (
  rowIndex(c1) != rowIndex(c2) ? rowIndex(c1) < rowIndex(c2) : colIndex(c1) < colIndex(c2)
)

const selection = {
  ongoing: false,
  start: null,
  end: null,
  firstRow: null,
  firstCol: null,
  lastRow: null,
  lastCol: null,
  cells: [],
  compute() {
    this.cells = this.cells.filter(c => c.selected == 2)
    if (this.start === this.end) {
      const cell = this.start
      cell.selected = 1
      this.cells.insertSort(cell, cellComp)
      return
    }
    const iMin = Math.min(rowIndex(this.start), rowIndex(this.end))
    const jMin = Math.min(colIndex(this.start), colIndex(this.end))
    const iMax = Math.max(rowIndex(this.start) + this.start.rowSpan, rowIndex(this.end) + this.end.rowSpan) - 1
    const jMax = Math.max(colIndex(this.start) + this.start.colSpan, colIndex(this.end) + this.end.colSpan) - 1

    let firstRow, firstCol, lastRow, lastCol
    let nextFirstRow=0, nextFirstCol=0, nextLastRow=rowCount()-1, nextLastCol=colCount()-1
    while (
         firstRow != (nextFirstRow = topBorder(iMin, nextFirstCol, nextLastCol))
      || firstCol != (nextFirstCol = leftBorder(jMin, nextFirstRow, nextLastRow))
      || lastRow  != (nextLastRow  = bottomBorder(iMax, nextFirstCol, nextLastCol))
      || lastCol  != (nextLastCol  = rightBorder(jMax, nextFirstRow, nextLastRow))
    ) {
      firstRow = nextFirstRow
      firstCol = nextFirstCol
      lastRow  = nextLastRow
      lastCol  = nextLastCol
    }

    rows()
      .filter((_, ri) => firstRow <= ri && ri <= lastRow)
      .flatMap(rowCells)
      .filter(c => firstCol <= colIndex(c) && colIndex(c) <= lastCol)
      .forEach(c => {
        if(c.selected == 2) return
        c.selected = 1
        this.cells.insertSort(c, cellComp)
      })
  },

  lock() {
    if (!this.ongoing) return
    selection.ongoing = false
    this.cells.forEach(c => { c.selected = 2 })
  },
  new(cell) {
    selection.ongoing = true
    this.start = cell
    this.end = cell
    cell.selected = 1
  },
  remove(cell) {
    cell.selected = 0
    this.cells = this.cells.filter(c => c !== cell)
  },
  clear() {
    this.ongoing = false
    this.cells.forEach(c => c.selected = 0)
    this.cells = []
  },

  first() {
    return this.cells[0]
  },
  last() {
    return this.cells[this.cells.length-1]
  },
  any() {
    return !!this.cells.length
  },
  includes(cell) {
    return this.cells.includes(cell)
  },
  update() {
    updateButtons()
    updateClassList()
    updateOutline()
  }
}

// CELL LISTENERS
const findCell = (i, j) => (
  cells().find(c => rowIndex(c) <= i && i <= rowIndex(c)+c.rowSpan-1 && colIndex(c) <= j && j <= colIndex(c)+c.colSpan-1)
)
// const leftCell = (cell) => (
//   cell.previousElementSibling ?? (colIndex(cell) == 0 ? cell.parentElement.previousElementSibling?.lastElementChild : findCell(rowIndex(cell), colIndex(cell)-1))
// )
// const rightCell = (cell) => (
//   cell.nextElementSibling ?? (colIndex(cell)+cell.colSpan == colCount() ? cell.parentElement.nextElementSibling?.firstElementChild : findCell(rowIndex(cell), colIndex(cell)+1))
// )
const addCellListeners = (cell) => {
  cell.addEventListener('mousedown', e => {
    e.stopPropagation()
    if (e.metaKey) {
      if (selection.includes(cell)) {
        selection.remove(cell)
      } else {
        if (!selection.any()) { cell.contentEditable = false }
        selection.new(cell)
        selection.compute()
      }
    } else if (e.shiftKey) {
      if (!selection.any()) { cell.contentEditable = false }
      selection.clear()
      selection.new(cell)
      selection.compute()
    } else {
      selection.clear()
      cell.contentEditable = true
      cell.focus()
    }
    selection.update()
  })
  cell.addEventListener('mouseenter', e => {
    if (e.shiftKey && selection.ongoing) {
      selection.end = cell
      selection.compute()
      selection.update()
    }
  })
  cell.addEventListener('blur', () => {
    cell.contentEditable = false
  })

  cell.addEventListener('keydown', e => {
    let nextCell
    switch (e.key) {
      case 'ArrowUp':
        nextCell = findCell(rowIndex(cell)-1, colIndex(cell)) ?? findCell(rowCount()-1, colIndex(cell)-1) ?? cell
        break;
      case 'ArrowDown':
        nextCell = findCell(rowIndex(cell)+cell.rowSpan, colIndex(cell)) ?? findCell(0, colIndex(cell)+cell.colSpan) ?? cell
        break;
      case 'Tab':
        nextCell = e.shiftKey
          ? (cell.previousElementSibling ?? cell.parentElement.previousElementSibling?.lastElementChild ?? cell)
          : (cell.nextElementSibling ?? cell.parentElement.nextElementSibling?.firstElementChild ?? cell)
        break;
      case 'ArrowLeft':
        nextCell = document.getSelection().anchorOffset == 0 && (cell.previousElementSibling ?? cell.parentElement.previousElementSibling?.lastElementChild ?? cell)
        break;
      case 'ArrowRight':
        nextCell = document.getSelection().anchorOffset == cell.textContent.length && (cell.nextElementSibling ?? cell.parentElement.nextElementSibling?.firstElementChild ?? cell)
        break;
    }
    if (!nextCell) return

    e.preventDefault()
    e.stopPropagation()
    if (nextCell === cell) return

    cell.contentEditable = false

    if (e.key != 'Tab' && e.shiftKey) {
      selection.new(cell)
      selection.end = nextCell
      selection.compute()
      selection.update()
    } else {
      nextCell.contentEditable = true
      nextCell.focus()
    }
  })
}
document.addEventListener('mouseup', () => {
  selection.lock()
})
document.addEventListener('click', e => {
  if (editingClass !== null && editClassContainer.contains(e.target)) {
    editingClass = null
    editClassContainer.style.display = 'none'
    updateButtons()
    return
  }
  if (table.contains(e.target)) return
  if (classes.contains(e.target)) return
  selection.clear()
  selection.update()
})
cells().forEach(addCellListeners)

// SELECTION OUTLINE
const svg = document.getElementById('selection')
const path = svg.firstElementChild
path.setAttribute('stroke-width', css.selectionBorder)
path.setAttribute('stroke', css.selectionColor)
const b = css.selectionBorder
const o = css.selectionOffset
const w = css.cellWidth
const h = css.cellHeight
const hash = (i, j) => `${i},${j}`
const unhash = (h) => h.split(',').map(k => parseInt(k))

const updateOutline = () => {
  const width  = colCount() * w + 2 * o + b
  const height = rowCount() * h + 2 * o + b
  svg.setAttribute('width',   `${width}`)
  svg.setAttribute('height',  `${height}`)
  svg.setAttribute('viewBox', `${-o -b/2} ${-o -b/2} ${width} ${height}`)

  let d = ''
  selection.cells
    .reduce((coords, c) => {
      const [i, j] = [rowIndex(c), colIndex(c)]
      range(c.rowSpan).forEach(k => {
        range(c.colSpan).forEach(l => {
          coords.add(hash(i+k, j+l))
        })
      })
      return coords
    }, new Set())
    .forEach((coord, _, coords) => {
      const [i, j]   = unhash(coord)
      const right    = coords.has(hash(i,   j+1))
      const topRight = coords.has(hash(i-1, j+1))
      const top      = coords.has(hash(i-1, j))
      const topLeft  = coords.has(hash(i-1, j-1))
      const left     = coords.has(hash(i,   j-1))
      const botLeft  = coords.has(hash(i+1, j-1))
      const bot      = coords.has(hash(i+1, j))
      const botRight = coords.has(hash(i+1, j+1))

      if (!right) {
        const x =  (j+1)*w + o
        const y0 = i*h     + (topRight ? +o : -o)
        const y1 = (i+1)*h + (botRight ? -o : +o)
        d += `M ${x} ${y0} V ${y1} `
      }
      if (!top) {
        const x0 = j*w     + (topLeft ? +o : -o)
        const x1 = (j+1)*w + (topRight ? -o : +o)
        const y =  i*h     - o
        d += `M ${x0} ${y} H ${x1} `
      }
      if (!left) {
        const x =  j*w     - o
        const y0 = i*h     + (topLeft ? +o : -o)
        const y1 = (i+1)*h + (botLeft ? -o : +o)
        d += `M ${x} ${y0} V ${y1} `
      }
      if (!bot) {
        const x0 = j*w     + (botLeft ? +o : -o)
        const x1 = (j+1)*w + (botRight ? -o : +o)
        const y =  (i+1)*h + o
        d += `M ${x0} ${y} H ${x1} `
      }
    })

  path.setAttribute('d', d)
}

// HELPERS
const createCell = (tag) => {
  const cell = document.createElement(tag)
  addCellListeners(cell)
  return cell
}
const insertRow = (i) => {
  const newRow = document.createElement('tr')
  range(colCount()).forEach(_ => newRow.appendChild(createCell('td')))
  if (i < rowCount())
    rows()[i].insertAdjacentElement('beforebegin', newRow)
  else
    rows()[rowCount()-1].insertAdjacentElement('afterend', newRow)
}
const insertCol = (j) => {
  rows().forEach(r => {
    const cellAfter = rowCells(r).find(c => colIndex(c) >= j)
    if (cellAfter)
      cellAfter.insertAdjacentElement('beforebegin', createCell('td'))
    else
      r.appendChild(createCell('td'))
  })
}

// ACTIONS
const actions = []

actions.push({
  button: document.getElementById('select-all'),
  condition: () => ( newClassContainer.hidden && editingClass === null ),
  // modKeys: ['Meta'],
  // key: 'a',
  // showKey: true,
  callback() {
    selection.cells = []
    cells().forEach(c => { c.selected = 2; selection.cells.push(c) })
    selection.update()
  }
})

actions.push({
  button: document.getElementById('add-row-before'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: ['Meta'],
  key: 'k',
  showKey: true,
  callback() {
    const spannedIndices = new Set()
    const insertIndices = selection.cells
      .reduce((insertIndices, c) => {
        const i = rowIndex(c)
        range(c.rowSpan).slice(1).forEach(k => spannedIndices.add(i+k))
        insertIndices.add(i)
        return insertIndices
      }, new Set())
    spannedIndices.forEach(i => insertIndices.delete(i))
    insertIndices.forEach(insertRow)
    cache.clear('rows', 'rowCount', 'rowCells', 'rowIndex')
    selection.update()
  }
})

actions.push({
  button: document.getElementById('add-row-after'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: ['Meta'],
  key: 'j',
  showKey: true,
  callback() {
    const spannedIndices = new Set()
    const insertIndices = selection.cells
      .reduce((insertIndices, c) => {
        const i = rowIndex(c)
        range(c.rowSpan).slice(0, -1).forEach(k => spannedIndices.add(i+k))
        insertIndices.add(i + c.rowSpan - 1)
        return insertIndices
      }, new Set())
    spannedIndices.forEach(i => insertIndices.delete(i))
    insertIndices.forEach(i => insertRow(i+1))
    cache.clear('rows', 'rowCount', 'rowCells', 'rowIndex')
    selection.update()
  }
})

actions.push({
  button: document.getElementById('add-col-before'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: ['Meta'],
  key: 'h',
  showKey: true,
  callback() {
    const spannedIndices = new Set()
    const insertIndices = selection.cells
      .reduce((insertIndices, c) => {
        const j = colIndex(c)
        range(c.colSpan).slice(1).forEach(k => spannedIndices.add(j+k))
        insertIndices.add(j)
        return insertIndices
      }, new Set())
    spannedIndices.forEach(j => insertIndices.delete(j))
    insertIndices.forEach(insertCol)
    cache.clear('rowCells', 'colCount', 'colIndex')
    selection.update()
  }
})

actions.push({
  button: document.getElementById('add-col-after'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: ['Meta'],
  key: 'l',
  showKey: true,
  callback() {
    const spannedIndices = new Set()
    const insertIndices = selection.cells
      .reduce((insertIndices, c) => {
        const j = colIndex(c)
        range(c.colSpan).slice(0, -1).forEach(k => spannedIndices.add(j+k))
        insertIndices.add(j + c.colSpan - 1)
        return insertIndices
      }, new Set())
    spannedIndices.forEach(j => insertIndices.delete(j))
    insertIndices.forEach(j => insertCol(j+1))
    cache.clear('rowCells', 'colCount', 'colIndex')
    selection.update()
  }
})

actions.push({
  button: document.getElementById('delete-content'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: [],
  key: 'Backspace',
  showKey: true,
  callback() {
    selection.cells.forEach(c => c.textContent = '')
  }
})

actions.push({
  button: document.getElementById('delete-row'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: ['Meta'],
  key: 'Backspace',
  showKey: true,
  callback() {
    new Set(selection.cells.map(c => c.parentElement)).forEach(r => r.remove())
    selection.clear()
    cache.clear('rows', 'rowCount', 'rowIndex')
    selection.update()
  }
})

actions.push({
  button: document.getElementById('delete-col'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: ['Meta', 'Alt'],
  key: 'Backspace',
  showKey: true,
  callback() {
    const deletedCols = new Set(selection.cells.map(colIndex))
    cells().filter(c => deletedCols.has(colIndex(c))).forEach(c => c.remove())
    cache.clear('rowCells', 'colCount', 'colIndex')
    selection.clear()
    selection.update()
  }
})

actions.push({
  button: document.getElementById('merge-button'),
  condition() {
    const iMin = selection.cells.map(rowIndex).min()
    const iMax = selection.cells.map(c => rowIndex(c)+c.rowSpan-1).max()
    const jMin = selection.cells.map(colIndex).min()
    const jMax = selection.cells.map(c => colIndex(c)+c.colSpan-1).max()
    return selection.cells.length > 1 && newClassContainer.hidden && editingClass === null && cells()
      .some(c => !c.selected
        && iMin <= rowIndex(c) && rowIndex(c) <= iMax
        && jMin <= colIndex(c) && colIndex(c) <= jMax
      ) === false
  },
  modKeys: ['Meta'],
  key: 'm',
  showKey: true,
  callback() {
    const mergedCell = selection.first()
    mergedCell.setAttribute('rowspan', rowIndex(selection.last()) - rowIndex(selection.first()) + 1)
    mergedCell.setAttribute('colspan', colIndex(selection.last()) - colIndex(selection.first()) + 1)
    selection.cells.slice(1).forEach(c => c.remove())
    selection.clear()

    cache.clear('rowCells')
    selection.new(mergedCell)
    selection.compute()
    selection.lock()
    selection.update()
  }
})

actions.push({
  button: document.getElementById('unmerge-button'),
  condition: () => ( newClassContainer.hidden && editingClass === null && selection.cells.some(c => c.rowSpan!=1 || c.colSpan!=1) ),
  modKeys: ['Meta'],
  key: 'u',
  showKey: true,
  callback() {
    selection.cells.forEach(cell => {
      if (cell.rowSpan == 1 && cell.colSpan == 1) return

      const insertedCells = []
      range(cell.colSpan - 1).forEach(_ => {
        const newCell = createCell(cell.tagName)
        insertedCells.push(newCell)
        cell.insertAdjacentElement('afterend', newCell)
      })

      const [i, j] = [rowIndex(cell), colIndex(cell)]
      rows().slice(i+1, i+cell.rowSpan).forEach(row => {
        const nextCell = rowCells(row).find(c => colIndex(c) > j)
        range(cell.colSpan).forEach(_ => {
          const newCell = createCell(cell.tagName)
          insertedCells.push(newCell)
          if (nextCell)
            nextCell.insertAdjacentElement('beforebegin', newCell)
          else
            row.appendChild(newCell)
        })
      })

      cell.rowSpan = 1
      cell.colSpan = 1
      insertedCells.forEach(c => {
        c.selected = 2
        selection.cells.insertSort(c, cellComp)
      })
    })
    cache.clear('rowCells')
    selection.update()
  }
})

const saveState = () => (
  ('<style>\n'
    + [...sheet.cssRules].reduce((a, r) => a + r.cssText, '')
      .replaceAll(/[A-Za-z-]+:/g, '\n\t\t$&')
      .replaceAll(' }', '\n\t}\n')
      .replaceAll(/^.*\{ /mg, '\t$&')
    + '</style>\n'
    + table.innerHTML
      .replaceAll(' contenteditable="false"', '')
      .replaceAll(/^\s{6}/mg, '')
      .replace(/^\s*<table>/m, '<table>')
      .replace(/<svg.*<\/svg>/s, '')
  ).trim()
)
const loadState = (state) => {
  const parsed = new DOMParser().parseFromString(state, 'text/html')

  while (sheet.cssRules.length) sheet.deleteRule(0)
  sheet.replace(parsed.querySelector('style').innerHTML)

  table.querySelector('table')?.remove()
  table.prepend(parsed.querySelector('table'))

  selection.clear()
  cache.clear('rows', 'rowCells', 'rowCount', 'colCount', 'rowIndex', 'colIndex')
  cells().forEach(c => addCellListeners(c))
}

actions.push({
  button: document.getElementById('save-file'),
  condition: () => ( true ),
  modKeys: ['Meta'],
  key: 's',
  showKey: true,
  callback() { 
    // navigator.clipboard.writeText(saveState()) 
    const a = document.createElement('a')
    const url = window.URL.createObjectURL(new Blob([saveState()], { type: "text/plain" }))
    a.href = url
    a.download = "table.html"
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }
})

const loadFileInput = document.getElementById('load-file')
actions.push({
  button: loadFileInput.parentElement,
  condition: () => ( true ),
  modKeys: ['Meta'],
  key: 'o',
  showKey: true,
  callback() {}
})
loadFileInput.addEventListener('change', e => {
  const fileReader = new FileReader()
  fileReader.onloadend = () => { loadState(fileReader.result) }
  fileReader.readAsText(loadFileInput.files[0])
})

const history = []
const undoAction = {
  button: document.getElementById('undo'),
  condition: () => ( !!history.length ),
  modKeys: ['Meta'],
  key: 'z',
  showKey: true,
  callback() {
    loadState(history.pop())
  }
}
actions.push(undoAction)


// actions.push({
//   button: document.getElementById('thead-button'),
//   condition: () => ( selection.any() &&
//     rows()
//       .slice(0, rowIndex(selection.cells[selection.cells.length-1])+1)
//       .every(r => rowCells(r).every(c => selection.cells.includes(c)))
//     && rowHasBottomBorder(rowIndex(selection.cells[selection.cells.length-1]), 0, colCount()-1)
//   ),
//   modKeys: ['Meta'],
//   key: 't',
//   showKey: true,
//   callback() {
//     const lastRowIndex = rowIndex(selection.cells[selection.cells.length-1])
//     const thead = document.createElement('thead')
//     document.querySelector('tbody').insertAdjacentElement('beforebegin', thead)
//     rows().slice(0, lastRowIndex+1).forEach(r => thead.appendChild(r))
//   }
// })

actions.push({
  button: document.getElementById('class-button'),
  condition: () => ( selection.any() && newClassContainer.hidden && editingClass === null ),
  modKeys: ['Meta'],
  key: 'c',
  showKey: true,
  callback() {
    newClassContainer.hidden = false
    newClassInput.focus()
    updateButtons()
  }
})

const addClassButton = document.getElementById('add-class')
newClassInput.addEventListener('blur', e => {
  if (e.relatedTarget === addClassButton) return
  newClassInput.value = ''
  newClassContainer.hidden = true
  updateButtons()
})
actions.push({
  button: addClassButton,
  condition: () => ( !newClassContainer.hidden && editingClass === null ),
  modKeys: [],
  key: 'Enter',
  showKey: false,
  callback() {
    const className = newClassInput.value
    if (className=='th' || className=='TH') {
      selection.cells.forEach((c, ci) => {
        const newCell = createCell('TH')
        newCell.textContent = c.textContent
        newCell.classList = c.classList
        c.parentElement.replaceChild(newCell, c)
        selection.cells[ci] = newCell
      })
    } else {
      selection.cells.forEach(c => c.classList.add(className))
    }
    newClassInput.value = ''
    newClassContainer.hidden = true
    updateButtons()

    cache.clear('rowCells', 'colIndex')
    selection.update()
  }
})

// ACTION LISTENERS
actions.forEach(a => {
  a.button.addEventListener('click', e => {
    e.stopPropagation()
    if (a !== undoAction) history.push(saveState())
    a.callback()
    undoAction.button.disabled = !undoAction.condition()
  })
})

const updateButtons = () => {
  actions.forEach(a => { 
    a.button.disabled = !a.condition() 
  })
}

// HOTKEYS
actions.forEach(a => {
  if (!a.key || !a.showKey) return
  let key = ''
  a.modKeys.forEach(modKey => {
    switch (modKey) {
      case 'Meta':    key += '⌘'; break;
      case 'Shift':   key += '⇧'; break;
      case 'Alt':     key += '⌥'; break;
      case 'Control': key += '⌃'; break;
    }
  })
  switch (a.key) {
    case 'ArrowLeft':  key += '←'; break;
    case 'ArrowUp':    key += '↑'; break;
    case 'ArrowRight': key += '→'; break;
    case 'ArrowDown':  key += '↓'; break;
    case 'Backspace':  key += '⌫'; break;
    default:           key += a.key.toUpperCase()
  }
  const span = document.createElement('SPAN')
  span.classList.add('key')
  span.textContent = key

  a.button.appendChild(span)
})
const modKeys = ['Meta', 'Shift', 'Alt', 'Control']
document.addEventListener('keydown', e => {
  if (selection.ongoing) {
    const cell = selection.end
    let nextCell
    switch (e.key) {
      case 'ArrowUp':
        nextCell = findCell(rowIndex(cell)-1, colIndex(cell)) ?? findCell(rowCount()-1, colIndex(cell)-1)
        break;
      case 'ArrowDown':
        nextCell = findCell(rowIndex(cell)+cell.rowSpan, colIndex(cell)) ?? findCell(0, colIndex(cell)+cell.colSpan)
        break;
      case 'ArrowLeft':
        nextCell = document.getSelection().anchorOffset == 0 && (cell.previousElementSibling ?? cell.parentElement.previousElementSibling?.lastElementChild)
        break;
      case 'ArrowRight':
        nextCell = document.getSelection().anchorOffset == cell.textContent.length && (cell.nextElementSibling ?? cell.parentElement.nextElementSibling?.firstElementChild)
        break;
      default: return;
    }
    if (nextCell && nextCell !== cell) {
      selection.end = nextCell
      selection.compute()
      selection.update()
    }
  } else {
    actions.forEach(a => {
      if (!a.key) return
      if (a.button?.disabled ?? a.input?.disabled) return
      if (
        e.key == a.key &&
        modKeys.every(modKey => a.modKeys.includes(modKey) == e.getModifierState(modKey))
      ) {
        e.preventDefault()
        a.button.click()
      }
    })
  }
})
document.addEventListener('keyup', e => {
  if (e.key == 'Shift') { selection.lock() }
})

// EDIT CLASS
editClassContainer.style.display = 'none'
let editingClass = null
// var style = document.createElement('style');
// style.type = 'text/css';
// document.querySelector('head').appendChild(style);
// const sheet = [...document.styleSheets].find(sheet => sheet.ownerNode === style)
const sheet = new CSSStyleSheet()
document.adoptedStyleSheets = [sheet]

const classEdition = (cl, e) => {
  e.stopPropagation()
  editingClass = cl
  editClassContainer.style.display = 'flex'
  colorInput.value = getClassProperty('color') || '#000'
  backgroundInput.value = getClassProperty('background-color') || '#fff'
  updateButtons()
}
const getClassProperty = (property) => {
  const selector = editingClass == 'th' ? 'th' : `.${editingClass}`
  const rule = [...sheet.cssRules].find(rule => rule.selectorText == selector)
  return rule?.style.getPropertyValue(property)
}
const editClassProperty = (property, value) => {
  const selector = editingClass == 'th' ? 'th' : `.${editingClass}`
  const rule = [...sheet.cssRules].find(rule => rule.selectorText == selector)
  if (rule) {
    if (value == rule.style.getPropertyValue(property))
      rule.style.removeProperty(property)
    else
      rule.style.setProperty(property, value)
  } else {
    sheet.insertRule(`${selector} { ${property}: ${value}; }`)
  }
}

const classActions = []
classActions.push({
  button: document.getElementById('edit-class-bold'),
  callback() { editClassProperty('font-weight', 'bold') }
})
classActions.push({
  button: document.getElementById('edit-class-italic'),
  callback() { editClassProperty('font-style', 'italic') }
})
classActions.push({
  button: document.getElementById('edit-class-underline'),
  callback() { editClassProperty('text-decoration', 'underline') }
})
classActions.push({
  button: document.getElementById('edit-class-left-align'),
  callback() { editClassProperty('text-align', 'left') }
})
classActions.push({
  button: document.getElementById('edit-class-right-align'),
  callback() { editClassProperty('text-align', 'right') }
})
const colorInput = document.getElementById('edit-class-color')
classActions.push({
  input: colorInput,
  callback() { editClassProperty('color', this.input.value) }
})
const backgroundInput = document.getElementById('edit-class-background')
classActions.push({
  input: backgroundInput,
  callback() { editClassProperty('background-color', this.input.value) }
})
classActions.push({
  button: document.getElementById('edit-class-validate'),
  callback() {
    editingClass = null
    editClassContainer.style.display = 'none'
    updateButtons()
  }
})

classActions.forEach(a => {
  a.button?.addEventListener('click', e => {
    e.stopPropagation()
    a.callback()
  })
  a.input?.parentElement.addEventListener('click', e => { e.stopPropagation() })
  a.input?.addEventListener('change', e => { a.callback() })
})


const createClassItem = (cl) => {
  const container = document.createElement('DIV')
  container.classList.add('class-item')

  const editButton = document.createElement('BUTTON')
  const deleteButton = document.createElement('BUTTON')
  deleteButton.textContent = '×'
  container.appendChild(editButton)
  container.appendChild(deleteButton)
  classes.appendChild(container)

  editButton.addEventListener('click', e => classEdition(cl, e))
  if (cl == 'th') {
    editButton.textContent = '<th>'
    container.classList.add('class-th')
    deleteButton.addEventListener('click', e => {
      e.stopPropagation()
      selection.cells.forEach((c, ci) => {
        const newCell = createCell('td')
        newCell.textContent = c.textContent
        newCell.classList = c.classList
        c.parentElement.replaceChild(newCell, c)
        selection.cells[ci] = newCell
      })
      container.remove()

      cache.clear('rowCells', 'colIndex')
      selection.update()
    })
  } else {
    editButton.textContent = '.'+cl
    deleteButton.addEventListener('click', e => {
      e.stopPropagation()
      selection.cells.forEach(c => c.classList.remove(cl))
      container.remove()
    })
  }
  return container
}

// UPDATE CLASS LIST
const updateClassList = () => {
  classes.querySelectorAll('.class-item').forEach(ci => ci.remove())
  if (!selection.any()) return

  const cell = selection.cells[0]
  let classList = new Set(cell.classList)
  let commonClassList = new Set(cell.classList)
  let hasHead = cell.tagName == 'TH'
  let commonHead = cell.tagName == 'TH'

  selection.cells.forEach(c => {
    const cls = new Set(c.classList)
    classList = classList.union(cls)
    commonClassList = commonClassList.intersection(cls)
    hasHead ||= c.tagName == 'TH'
    commonHead &&= c.tagName == 'TH'
  })
  if (hasHead) classList.add('th')
  if (commonHead) commonClassList.add('th');

  [...classList].reverse().forEach(cl => {
    const classItem = createClassItem(cl)
    if (commonClassList.has(cl)) classItem.classList.add('class-common')
  })
}