export function makeGrid<Cell>(x: number, y: number, init: (x: number, y: number) => Cell) {
  return [...Array(x)].map((_, i) => {
    return [...Array(y)].map((_, j) => {
      return { x: i, y: j, content: init(i, j) }
    })
  })
}

export type Grid<Cell> = ReturnType<typeof makeGrid<Cell>>
