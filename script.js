const table = document.getElementById('table-container')
const selectionEl = document.getElementById('selection')

const addRowBeforeButton = document.getElementById('add-row-before')
const addRowAfterButton = document.getElementById('add-row-after')
const addColBeforeButton = document.getElementById('add-col-before')
const addColAfterButton = document.getElementById('add-col-after')
const deleteRowButton = document.getElementById('delete-row')
const deleteColButton = document.getElementById('delete-col')
const mergeButton = document.getElementById('merge-button')
const unmergeButton = document.getElementById('unmerge-button')
const editClassButton = document.getElementById('edit-class')
const buttons = [addRowBeforeButton, addRowAfterButton, addColBeforeButton, addColAfterButton, deleteRowButton, deleteColButton, mergeButton, unmergeButton, editClassButton]

let dummy = 9;

function* range(start, end=null, step=1) { 
  if (end === null) for (let i=0; i<start; i+=step) yield i 
  else for (let i=start; i<end; i+=step) yield i
}

const rowCount = () => table.querySelectorAll('tr').length
const colCount = () => rowCells(table.querySelector('tr')).reduce((n, c) => n+c.colSpan, 0)

const rows = () => [...table.querySelectorAll('tr')]
const rowCells = (row) => [...row.querySelectorAll('td, th')]

const rowIndex = (cell) => {
  return rows().findIndex(r => r == cell.parentElement)
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

const rowMinMaxIndex = (i, aj=null, bj=null) => {
  let min=i, max=i
  // console.log('init:', i, aj, bj)
  for (const [ri, r] of rows().entries()) {
    if (ri > i) break
    const imax = aj === null || bj === null 
      ? Math.max(...rowCells(r).map(c => ri+c.rowSpan-1))
      : Math.max(...rowCells(r).map(c => aj<=colIndex(c)+c.colSpan-1 && colIndex(c)<=bj ? ri+c.rowSpan-1 : 0))
    // console.log('loop:', ri, r, rowCells(r).map(c => (cj => aj<=cj+c.colSpan-1 && cj<=bj ? ri+c.rowSpan-1 : 0)(colIndex(c)) ))
    if (imax >= i && ri < min) min = ri
    if (imax > max) max = imax
  }
  // console.log('retn:', min, max)
  return {min, max}
}
const colMinMaxIndex = (j, ai=null, bi=null) => {
  let min=j, max=j
  // console.log('init:', j, ai, bi)
  for (const [ri, r] of rows().entries()) {
    for (const c of rowCells(r)) {
      const cj = colIndex(c)
      if (ai !== null && bi !== null && !(ai<=ri+c.rowSpan-1 && ri<=bi)) continue
      // console.log('loop:', ri, r, cj, c, c.colSpan)
      if (cj > j) break
      if (cj+c.colSpan > j && cj < min) min = cj
      if (cj+c.colSpan-1 > max) max = cj+c.colSpan-1
    }
  }
  // console.log('retn:', min, max)
  return {min, max}
}
const rowHasBorders = (i, aj=null, bj=null) => {
  const {min, max} = rowMinMaxIndex(i, aj, bj)
  // console.log('rowb:', i, aj, bj, min==i, max==i)
  return {top: min == i, bottom: max == i}
}
const colHasBorders = (j, ai=null, bi=null) => {
  const {min, max} = colMinMaxIndex(j, ai, bi)
  // console.log('colb:', j, ai, bi, min==j, max==j)
  return {left: min == j, right: max == j}
}

const topBorder =    (i, aj, bj) => [...range(i+1)].findLast(ii => rowHasBorders(ii, aj, bj).top)
const leftBorder =   (j, ai, bi) => [...range(j+1)].findLast(jj => colHasBorders(jj, ai, bi).left)
const bottomBorder = (i, aj, bj) => [...range(i, rowCount())].find(ii => rowHasBorders(ii, aj, bj).bottom)
const rightBorder =  (j, ai, bi) => [...range(j, colCount())].find(jj => colHasBorders(jj, ai, bi).right)

const selection = { 
  active: false,
  ongoing: false,
  start: null,
  end: null,
  firstRow: null,
  firstCol: null,
  lastRow: null,
  lastCol: null,
  cells: [],
  update() {
    if (!this.active) {
      selectionEl.style.display = 'none'
      buttons.forEach(b => b.disabled = true)
      return
    }

    const si = rowIndex(this.start)
    const sj = colIndex(this.start)
    const ei = rowIndex(this.end)
    const ej = colIndex(this.end)

    const mini = Math.min(si, ei)
    const minj = Math.min(sj, ej)
    const maxi = Math.max(si+this.start.rowSpan, ei+this.end.rowSpan) - 1
    const maxj = Math.max(sj+this.start.colSpan, ej+this.end.colSpan) - 1

    let nextFirstRow = topBorder(mini, minj, maxj)
    let nextFirstCol = leftBorder(minj, mini, maxi)
    let nextLastRow  = bottomBorder(maxi, minj, maxj)
    let nextLastCol  = rightBorder(maxj, mini, maxi)
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

    selectionEl.style.display = 'block'
    selectionEl.style.left    = `${this.firstCol*3-.20}rem`
    selectionEl.style.top     = `${this.firstRow*2-.20}rem`
    selectionEl.style.width   = `${(this.lastCol-this.firstCol+1)*3}rem`
    selectionEl.style.height  = `${(this.lastRow-this.firstRow+1)*2}rem`

    this.cells = rows().reduce(
      (cs, r, ri) => cs.concat(selection.firstRow<=ri && ri<=selection.lastRow
        ? rowCells(r).filter(c => selection.firstCol<=colIndex(c) && colIndex(c)<=selection.lastCol)
        : []
      ), []
    )

    const oneCellSelected = this.start === this.end
    mergeButton.disabled = oneCellSelected
    unmergeButton.disabled = this.cells.find(c => c.rowSpan!=1 || c.colSpan!=1) === undefined
    addColAfterButton.disabled =  !oneCellSelected
    addColBeforeButton.disabled = !oneCellSelected
    addRowAfterButton.disabled =  !oneCellSelected
    addRowBeforeButton.disabled = !oneCellSelected
    deleteRowButton.disabled =    !oneCellSelected
    deleteColButton.disabled =    !oneCellSelected
    editClassButton.disabled = false
  }
}

const bindSelectable = (cell) => {
  cell.addEventListener('mousedown', (e) => {
    e.preventDefault()
    selection.active = true
    selection.ongoing = true
    selection.start = cell
    selection.end = cell
    selection.update()
  })

  cell.addEventListener('mouseenter', (e) => {
    if (!selection.ongoing) return
    selection.end = cell
    selection.update()
  })
}

table.querySelectorAll('td, th').forEach(bindSelectable)
const createCell = (tag) => {
  const cell = document.createElement(tag)
  cell.innerText = String(dummy++)
  bindSelectable(cell)
  return cell
}


document.addEventListener('mouseup', () => {
  selection.ongoing = false
})
document.addEventListener('click', (e) => {
  if (!table.contains(e.target)) {
    selection.active = false
    selection.update()
  }
})


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

addColBeforeButton.addEventListener('click', (e) => {
  e.stopPropagation()
  selection.start.col += 1
  selection.end.col += 1
  selection.update()
  colIndexCache.clear()

  insertColumn(selection.firstCol)
})
addColAfterButton.addEventListener('click', (e) => {
  e.stopPropagation()
  colIndexCache.clear()

  insertColumn(selection.lastCol+1)
})
addRowBeforeButton.addEventListener('click', (e) => {
  e.stopPropagation()
  selection.start.row += 1
  selection.end.row += 1
  selection.update()
  colIndexCache.clear()

  insertRow(selection.firstRow)
})
addRowAfterButton.addEventListener('click', (e) => {
  e.stopPropagation()

  insertRow(selection.lastRow+1)
  colIndexCache.clear()
})

mergeButton.addEventListener('click', () => {
  selection.active = false
  selection.update()

  const cells = [...table.querySelectorAll('td, th')].filter(cell => {
    const i = rowIndex(cell)
    const j = colIndex(cell)
    return (selection.firstRow <= i && i <= selection.lastRow
         && selection.firstCol <= j && j <= selection.lastCol)
  })
  cells[0].setAttribute('rowspan', selection.lastRow-selection.firstRow+1)
  cells[0].setAttribute('colspan', selection.lastCol-selection.firstCol+1)
  cells.slice(1).forEach(c => c.remove())
  colIndexCache.clear()
})

const unmerge = (cell) => {
  if (cell.rowSpan==1 && cell.colSpan==1) return
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
unmergeButton.addEventListener('click', () => {
  selection.active = false
  selection.update()

  selection.cells.forEach(unmerge)
  colIndexCache.clear()
})
