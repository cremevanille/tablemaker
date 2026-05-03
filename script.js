const table = document.getElementById('table-container')
const selectionEl = document.getElementById('selection')
const rowTools = document.getElementById('row-tools')
const colTools = document.getElementById('col-tools')
const addRowBeforeButton = document.getElementById('add-row-before')
const addRowAfterButton = document.getElementById('add-row-after')
const addColBeforeButton = document.getElementById('add-col-before')
const addColAfterButton = document.getElementById('add-col-after')
const mergeButton = document.getElementById('merge-button')
const unmergeButton = document.getElementById('unmerge-button')

let cols = table.querySelector('tr')?.children.length || 0
let rows = table.querySelectorAll('tr').length
const selection = { 
  active: false,
  ongoing: false,
  start: null,
  end: null,
  first: null,
  last: null,
}

const rowIndex = (cell) => {
  return [...table.querySelectorAll('tr')].findIndex(r => r == cell.parentElement)
}
const colIndex = (cell) => {
  const emptyIndices = []
  const i = rowIndex(cell);
  table.querySelectorAll('tr').forEach((row, ii) => {
    if (ii >= i) return
    row.querySelectorAll('td, th').forEach(c => {
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
const updateSelection = () => {
  if (!selection.active) {
    selectionEl.style.display = 'none'
    mergeButton.disabled = true
    unmergeButton.disabled = true
    return
  }
  selectionEl.style.display = 'block'

  mergeButton.disabled = selection.start == selection.end
  unmergeButton.disabled = selection.start != selection.end || (selection.start.rowSpan == 1 && selection.start.colSpan == 1)
  
  const starti = rowIndex(selection.start)
  const startj = colIndex(selection.start)
  const endi = rowIndex(selection.end)
  const endj = colIndex(selection.end)

  selection.first = {
    row: Math.min(starti, endi),
    col: Math.min(startj, endj),
  }
  selection.last = {
    row: Math.max(starti + selection.start.rowSpan, endi + selection.end.rowSpan),
    col: Math.max(startj + selection.start.colSpan, endj + selection.end.colSpan),
  }
  selectionEl.style.left = `${selection.first.col*3-.20}rem`
  selectionEl.style.top = `${selection.first.row*2-.20}rem`
  selectionEl.style.width = `${(selection.last.col-selection.first.col)*3}rem`
  selectionEl.style.height = `${(selection.last.row-selection.first.row)*2}rem`
}

const createCell = (tag) => {
  const cell = document.createElement(tag)
  bindShowButtons(cell)
  bindSelectable(cell)
  return cell
}
const insertRow = (i, before) => {
  if (selection.active) {
    selection.active = false
    updateSelection()
  }
  const row = table.querySelectorAll('tr')[i]
  const newRow = document.createElement('tr')
  for (let j=0; j<cols; j++) {
    const newCell = createCell('td')
    newRow.appendChild(newCell)
  }
  if (before)
    row.parentElement.insertBefore(newRow, row)
  else if (row.nextSibling) 
    row.parentElement.insertBefore(newRow, row.nextSibling)
  else 
    row.parentElement.appendChild(newRow)
  rows++
}
const insertColumn = (j, before) => {
  if (selection.active) {
    selection.active = false
    updateSelection()
  }
  table.querySelectorAll('tr').forEach((row, i) => {
    const cell = row.querySelectorAll('td, th')[j]
    // findLast
    const newCell = createCell(cell.tagName)
    if (before)
      row.insertBefore(newCell, cell)
    else if (cell.nextSibling)
      row.insertBefore(newCell, cell.nextSibling)
    else 
      row.appendChild(newCell)
  })
  cols++
}


const bindShowButtons = (cell) => cell.addEventListener('mouseenter', (e) => {
  const tableRect = table.getBoundingClientRect()
  const cellRect = cell.getBoundingClientRect()

  const i = rowIndex(cell)
  const j = colIndex(cell)

  rowTools.disabled = false
  rowTools.style.visibility = 'visible'
  rowTools.style.opacity = '1'
  rowTools.style.top = `${cellRect.top - tableRect.top + cellRect.height/2 - rowTools.offsetHeight/2}px`
  rowTools.index = i

  rowTools.disabled = false
  colTools.style.visibility = 'visible'
  colTools.style.opacity = '1'
  colTools.style.left = `${cellRect.left - tableRect.left + cellRect.width/2 - colTools.offsetWidth/2}px`
  colTools.index = j
  
  for (const row of table.querySelectorAll('tr')) {
    let jj
    const cc = [...row.querySelectorAll('td, th')].findLast(c => (jj = colIndex(c)) <= j)
    if (!cc) continue
    if (cc.colSpan > j-jj+1) {
      console.log(cc, jj, j)
      addColAfterButton.disabled = true
      break
    }
  }
})
const bindSelectable = (cell) => {
  cell.addEventListener('mousedown', (e) => {
    e.preventDefault()
    selection.active = true
    selection.ongoing = true
    selection.start = cell
    selection.end = cell
    updateSelection()
  })

  cell.addEventListener('mouseenter', (e) => {
    if (!selection.ongoing) return
    selection.end = cell
    updateSelection()
  })
}


table.querySelectorAll('td, th').forEach(cell => {
  bindShowButtons(cell)
  bindSelectable(cell)
});
document.addEventListener('mouseup', () => {
  selection.ongoing = false
})
document.addEventListener('click', (e) => {
  if (!table.contains(e.target)) {
    selection.active = false
    updateSelection()
  }
})
document.getElementById('add-col-before').addEventListener('click', (e) => {
  e.stopPropagation()
  insertColumn(colTools.index, true)
})
document.getElementById('add-col-after').addEventListener('click', (e) => {
  e.stopPropagation()
  insertColumn(colTools.index, false)
})
document.getElementById('add-row-before').addEventListener('click', (e) => {
  e.stopPropagation()
  insertRow(rowTools.index, true)
})
document.getElementById('add-row-after').addEventListener('click', (e) => {
  e.stopPropagation()
  insertRow(rowTools.index, false)
})
table.addEventListener('mouseleave', () => {
  setTimeout(() => {
    if (!table.matches(':hover')) {
      rowTools.style.visibility = 'hidden'
      rowTools.style.opacity = '0'
      colTools.style.visibility = 'hidden'
      colTools.style.opacity = '0'
    }
  }, 300)
})


mergeButton.addEventListener('click', () => {
  if (!selection.active) return
  selection.active = false
  updateSelection()

  const cells = [...table.querySelectorAll('td, th')].filter(cell => {
    const i = rowIndex(cell)
    const j = colIndex(cell)
    return (i >= selection.first.row && i < selection.last.row
         && j >= selection.first.col && j < selection.last.col)
  })
  cells[0].setAttribute('rowspan', selection.last.row-selection.first.row)
  cells[0].setAttribute('colspan', selection.last.col-selection.first.col)
  for (let i=1; i<cells.length; i++) {
    cells[i].remove()
  }
})

unmergeButton.addEventListener('click', () => {
  if (!selection.active) return
  selection.active = false
  updateSelection()
  
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
      for (const _ of Array(colspan)) 
        row.firstElementChild.insertAdjacentElement('beforebegin', createCell(cell.tagName))
    }
  } else {
    const cellsBefore = []
    for (const _ of Array(cell.rowSpan-1)) {
      row = row.nextElementSibling
      for (const _ of Array(colspan)) {
        const cellAfter = [...cell.querySelectorAll('td, th')].find(c => colIndex(c) > j)
        cellsBefore.push(cellAfter?.previousElementSibling ?? row.lastElementChild)
      }
    }
    cellsBefore.forEach(c => { c.insertAdjacentElement('afterend', createCell(cell.tagName)) })
  }
  cell.rowSpan = 1
  cell.colSpan = 1
})