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
const colIndex = (cell) => {
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
  let j = 0
  for (const c of cell.parentElement.querySelectorAll('td, th')) {
    while (emptyIndices.includes(j)) j++
    if (c === cell) break
    j += c.colSpan
  }
  return j
}


const rowMinMaxIndex = (i, aj=null, bj=null) => {
  let min = i
  let max = i
  console.log('init:', i, aj, bj)
  for (const [ri, r] of rows().entries()) {
    if (ri > i) break
    const imax = aj === null || bj === null 
      ? Math.max(...rowCells(r).map(c => ri+c.rowSpan-1))
      : Math.max(...rowCells(r).map(c => (cj => aj<=cj+c.colSpan-1 && cj<=bj ? ri+c.rowSpan-1 : 0)(colIndex(c)) ))
    console.log('loop:', ri, r, rowCells(r).map(c => (cj => aj<=cj+c.colSpan-1 && cj<=bj ? ri+c.rowSpan-1 : 0)(colIndex(c)) ))
    if (imax >= i && ri < min) min = ri
    if (imax > max) max = imax
  }
  console.log('retn:', min, max)
  return {min, max}
}
const colMinMaxIndex = (j, ai=null, bi=null) => {
  let min = j
  let max = j
  // console.log('init:', j, ai, bi)
  for (const [ri, r] of rows().entries()) {
    for (const [cj, c] of rowCells(r).entries()) {
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
  return {top: min == i, bottom: max == i}
}
const colHasBorders = (j, ai=null, bi=null) => {
  const {min, max} = colMinMaxIndex(j, ai, bi)
  return {left: min == j, right: max == j}
}

const createCell = (tag) => {
  const cell = document.createElement(tag)
  cell.innerText = String(dummy++)
  bindSelectable(cell)
  return cell
}

const selection = { 
  active: false,
  ongoing: false,
  start: null,
  end: null,
  first: { row: null, col: null },
  last: { row: null, col: null },
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

    this.first.row = [...range(mini+1)].findLast(i => rowHasBorders(i, minj, maxj).top)
    this.last.row  = [...range(maxi, rowCount()+1)].find(i => rowHasBorders(i, minj, maxj).bottom)
    this.first.col = [...range(minj+1)].findLast(j => colHasBorders(j, mini, maxi).left)
    this.last.col  = [...range(maxj, colCount()+1)].find(j => colHasBorders(j, mini, maxi).right)

    selectionEl.style.display = 'block'
    selectionEl.style.left = `${this.first.col*3-.20}rem`
    selectionEl.style.top = `${this.first.row*2-.20}rem`
    selectionEl.style.width = `${(this.last.col-this.first.col+1)*3}rem`
    selectionEl.style.height = `${(this.last.row-this.first.row+1)*2}rem`

    const oneCellSelected = this.start === this.end
    mergeButton.disabled = oneCellSelected
    unmergeButton.disabled = !(oneCellSelected && (this.start.rowSpan != 1 || this.start.colSpan != 1))
    addColAfterButton.disabled = !oneCellSelected
    addColBeforeButton.disabled = !oneCellSelected
    addRowAfterButton.disabled = !oneCellSelected
    addRowBeforeButton.disabled = !oneCellSelected
    deleteRowButton.disabled = !oneCellSelected
    deleteColButton.disabled = !oneCellSelected
    editClassButton.disabled = false
  }
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


table.querySelectorAll('td, th').forEach(cell => {
  bindSelectable(cell)
});
document.addEventListener('mouseup', () => {
  selection.ongoing = false
})
document.addEventListener('click', (e) => {
  if (!table.contains(e.target)) {
    selection.active = false
    selection.update()
  }
})


addColBeforeButton.addEventListener('click', (e) => {
  e.stopPropagation()
  insertColumn(selection.first.col)
  selection.start.col += 1
  selection.end.col += 1
  selection.update()
})
addColAfterButton.addEventListener('click', (e) => {
  e.stopPropagation()
  insertColumn(selection.last.col+1)
})
addRowBeforeButton.addEventListener('click', (e) => {
  e.stopPropagation()
  insertRow(selection.first.row)
  selection.start.row += 1
  selection.end.row += 1
  selection.update()
})
addRowAfterButton.addEventListener('click', (e) => {
  e.stopPropagation()
  insertRow(selection.last.row+1)
})

mergeButton.addEventListener('click', () => {
  if (!selection.active) return
  selection.active = false
  selection.update()

  const cells = [...table.querySelectorAll('td, th')].filter(cell => {
    const i = rowIndex(cell)
    const j = colIndex(cell)
    return (selection.first.row <= i && i <= selection.last.row
         && selection.first.col <= j && j <= selection.last.col)
  })
  cells[0].setAttribute('rowspan', selection.last.row-selection.first.row+1)
  cells[0].setAttribute('colspan', selection.last.col-selection.first.col+1)
  for (let i=1; i<cells.length; i++) {
    cells[i].remove()
  }
})

unmergeButton.addEventListener('click', () => {
  if (!selection.active) return
  selection.active = false
  selection.update()
  
  const cell = selection.start
  const colspan = cell.colSpan
  for (const _ of Array(colspan-1)) {
    cell.insertAdjacentElement('afterend', createCell(cell.tagName))
  }

  const j = colIndex(cell)
  let row = cell.parentElement
  if (j === 0) {
    for (const _ of Array(cell.rowSpan-1)) {
      row = row.nextElementSibling
      const firstCell = row.firstElementChild
      if (firstCell) {
        for (const _ of Array(colspan))
          firstCell.insertAdjacentElement('beforebegin', createCell(cell.tagName))
      } else {
        for (const _ of Array(colspan))
          row.appendChild(createCell(cell.tagName))
      }
    }
  } else {
    const cellsBefore = []
    for (const _ of Array(cell.rowSpan-1)) {
      row = row.nextElementSibling
      const cellBefore = rowCells(row).findLast(c => colIndex(c) <= j)
      if (cellBefore) {
        for (const _ of Array(colspan))
          cellsBefore.push(cellBefore)
      } else {
        for (const _ of Array(colspan))
          row.appendChild(createCell(cell.tagName))
      }
    }
    cellsBefore.forEach(c => { c.insertAdjacentElement('afterend', createCell(cell.tagName)) })
  }
  cell.rowSpan = 1
  cell.colSpan = 1
})
