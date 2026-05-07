const header = document.querySelector('header')
const table = document.getElementById('table-container')
const selectionEl = document.getElementById('selection')
const textInput = document.getElementById('text-input')

const addRowBeforeButton = document.getElementById('add-row-before')
const addRowAfterButton = document.getElementById('add-row-after')
const addColBeforeButton = document.getElementById('add-col-before')
const addColAfterButton = document.getElementById('add-col-after')
const deleteRowButton = document.getElementById('delete-row')
const deleteColButton = document.getElementById('delete-col')
const mergeButton = document.getElementById('merge-button')
const unmergeButton = document.getElementById('unmerge-button')
const headSwitch = document.getElementById('head-switch')
const editClassButton = document.getElementById('edit-class')
const copyHtmlButton = document.getElementById('copy-html')

let dummy = 9;

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
      selectionEl.style.display = 'none';
      addRowBeforeButton.disabled = true
      addRowAfterButton.disabled = true
      addColBeforeButton.disabled = true
      addColAfterButton.disabled = true
      deleteRowButton.disabled = true
      deleteColButton.disabled = true
      mergeButton.disabled = true
      unmergeButton.disabled = true
      headSwitch.disabled = true
      editClassButton.disabled = true
      return
    }

    if (this.start == this.end) {
      this.firstRow = rowIndex(this.start)
      this.lastRow = this.firstRow+this.start.rowSpan-1
      this.firstCol = colIndex(this.start)
      this.lastCol = this.firstCol+this.start.colSpan-1
    } else {
      const si = rowIndex(this.start)
      const sj = colIndex(this.start)
      const ei = rowIndex(this.end)
      const ej = colIndex(this.end)

      const mini = Math.min(si, ei)
      const minj = Math.min(sj, ej)
      const maxi = Math.max(si+this.start.rowSpan, ei+this.end.rowSpan) - 1
      const maxj = Math.max(sj+this.start.colSpan, ej+this.end.colSpan) - 1

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

    mergeButton.disabled = this.start === this.end
    unmergeButton.disabled = this.cells.find(c => c.rowSpan!=1 || c.colSpan!=1) === undefined
    addColAfterButton.disabled =  false
    addColBeforeButton.disabled = false
    addRowAfterButton.disabled =  false
    addRowBeforeButton.disabled = false
    deleteRowButton.disabled =    false
    deleteColButton.disabled =    false
    headSwitch.disabled =         false
    editClassButton.disabled =    false
  }
}

const setCellListeners = (cell) => {
  const setEditable = () => {
    selection.ongoing = false
    cell.contentEditable = true
    cell.focus()
  }

  cell.addEventListener('mousedown', (e) => {

    if (e.altKey && selection.active) {
      // multi selection !!
    }

    cell.addEventListener('mouseup', setEditable)

    selection.active = false
    selection.ongoing = true
    selection.update()
    setTimeout(() => {
      cell.removeEventListener('mouseup', setEditable)
      if (selection.ongoing) {
        cell.contentEditable = false
        selection.active = true
        selection.start = cell
        const hoveredElement = [...document.querySelectorAll(':hover')].pop()
        selection.end = ['TD', 'TH'].includes(hoveredElement?.tagName) ? hoveredElement : cell
        selection.update()
      }
    }, 300)
  })

  cell.addEventListener('dblclick', () => {
      selection.active = false
      selection.ongoing = false
      selection.update()
      cell.contentEditable = true
      cell.focus()

      const docRange = document.createRange();
      docRange.selectNodeContents(cell);
      const winSelection = window.getSelection();
      winSelection.removeAllRanges();
      winSelection.addRange(docRange);
  })

  cell.addEventListener('mouseenter', () => {
    if (!selection.ongoing) return
    selection.end = cell
    selection.update()
  })

  cell.addEventListener('blur', () => {
    cell.contentEditable = false
  })
}
cells().forEach(setCellListeners)

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

const addColBeforeEvent = (e) => {
  if (e) e.stopPropagation()
  insertColumn(selection.firstCol)
  colIndexCache.clear()
  selection.update()
}
addColBeforeButton.addEventListener('click', addColBeforeEvent)

const addColAfterEvent = (e) => {
  if (e) e.stopPropagation()
  insertColumn(selection.lastCol+1)
  colIndexCache.clear()
}
addColAfterButton.addEventListener('click', addColAfterEvent)

const addRowBeforeEvent = (e) => {
  if (e) e.stopPropagation()
  insertRow(selection.firstRow)
  colIndexCache.clear()
  selection.update()
}
addRowBeforeButton.addEventListener('click', addRowBeforeEvent)

const addRowAfterEvent = (e) => {
  if (e) e.stopPropagation()
  insertRow(selection.lastRow+1)
  colIndexCache.clear()
}
addRowAfterButton.addEventListener('click', addRowAfterEvent)

const deleteRowEvent = (e) => {
  if (e) e.stopPropagation()
  const deletedCells = cells().filter(c => {
    const i = rowIndex(c)
    return selection.firstRow <= i && i <= selection.lastRow
  })
  deletedCells.forEach(c => c.remove())

  selection.active = false
  // colIndexCache.clear()
  selection.update()
}
deleteRowButton.addEventListener('click', deleteRowEvent)

const deleteColEvent = (e) => {
  if (e) e.stopPropagation()
  const deletedCells = cells().filter(c => {
    const j = colIndex(c)
    return selection.firstCol <= j && j <= selection.lastCol
  })
  deletedCells.forEach(c => c.remove())

  selection.active = false
  colIndexCache.clear()
  selection.update()
}
deleteColButton.addEventListener('click', deleteColEvent)

const mergeEvent = (e) => {
  if (e) e.stopPropagation()
  selection.active = false
  selection.update()

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
}
mergeButton.addEventListener('click', mergeEvent)

const unmergeCell = (cell) => {
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
const unmergeEvent = (e) => {
  if (e) e.stopPropagation()
  selection.active = false
  selection.update()

  selection.cells.forEach(unmergeCell)
  colIndexCache.clear()
}
unmergeButton.addEventListener('click', unmergeEvent)

const headSwitchEvent = (e) => {
  if (e) e.stopPropagation()
  const allHeads = selection.cells.every(c => c.tagName == 'TH')
  if (allHeads) {
    selection.cells.forEach(cell => {
      const newCell = createCell('TD')
      newCell.textContent = cell.textContent
      cell.parentElement.replaceChild(newCell, cell)
    })
  } else {
    selection.cells.forEach(cell => {
      if (cell.tagName == 'TH') return
      const newCell = createCell('TH')
      newCell.textContent = cell.textContent
      cell.parentElement.replaceChild(newCell, cell)
    })
  }

  // update selection cells
  selection.cells = rows().reduce(
    (cs, r, ri) => cs.concat(selection.firstRow<=ri && ri<=selection.lastRow
      ? rowCells(r).filter(c => selection.firstCol<=colIndex(c) && colIndex(c)<=selection.lastCol)
      : []
    ), []
  )
  selection.start = selection.cells[0]
  selection.end = selection.cells[selection.cells.length-1]
}
headSwitch.addEventListener('click', headSwitchEvent)

const validateEditClass = (e) => {
  if (e.keyCode !== 13) return

  selection.start.className = textInput.value
  textInput.value = 0
  textInput.hidden = true
  document.removeEventListener('keydown', validateEditClass);
}
const editClassEvent = (e) => {
  if (e) e.stopPropagation()
  textInput.hidden = false
  textInput.value = selection.start.className
  textInput.focus()

  document.addEventListener('keydown', validateEditClass);
}
editClassButton.addEventListener('click', editClassEvent)

copyHtmlButton.addEventListener('click', (e) => {
  if (e) e.stopPropagation()
  navigator.clipboard.writeText(
    table.querySelector('table').outerHTML.replaceAll(/ contenteditable=".*"/g, '')
  )
  copyHtmlButton.innerText = 'ok'
  setTimeout(() => { copyHtmlButton.innerText = 'cp' }, 1200)
})


document.addEventListener('keydown', e => {
  console.log(e.keyCode)
  switch (e.keyCode) {
    case 87: if (!addRowBeforeButton.disabled) addRowBeforeEvent(); break; // Z
    case 65:  if (!addColBeforeButton.disabled) addColBeforeEvent(); break; // Q
    case 83: if (!addRowAfterButton.disabled)  addRowAfterEvent();  break; // S
    case 68: if (!addColAfterButton.disabled)  addColAfterEvent();  break; // D
    case 77: if (!mergeButton.disabled)        mergeEvent();        break; // M
    case 85: if (!unmergeButton.disabled)      unmergeEvent();      break; // U
    case 72: if (!headSwitch.disabled)         headSwitchEvent();   break; // H
    case 67:  if (!editClassButton.disabled)    editClassEvent();    break; // C

    // case 37: // left
    //   break;
    // case 38: // up
    //   break;
    // case 39: // right
    //   break;
    // case 40: // down
    //   break;
  }
})

document.addEventListener('mouseup', () => {
  selection.ongoing = false
})
document.addEventListener('click', (e) => {

  // remove class input
  if (e.target != textInput) {
    textInput.value = 0
    textInput.hidden = true
    document.removeEventListener('keydown', validateEditClass);
  }

  // stop selection
  if (!table.contains(e.target) && !header.contains(e.target) && e.target != textInput) {
    selection.active = false
    selection.update()
  }
})