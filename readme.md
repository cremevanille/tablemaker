## Notes

State: react precisly to each change, to keep things synchronized
Render: render (all) when significant change is made.
In-between: chose what to render and when to render.

When a series of computation take place one after an other, you don't want
to render the UI after each computation. One way to solve this is to let
the `State` not only to single computations but also series of them. A series
of computation might only make sense in regard of a certain `<input>` or action
which can be weird to let the `State` handle it. The other way is to let the
`<input>` or action handle the rendering after the series of action, which is also
weird.


## Feat

- indication: shift select, cmd select, tab, shift tab, arrows
- `td` vs `th`, `scope`, [`headers`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/th#html_3), `thead`??, `caption`
- row/col selection
- class input: show list of classes (as color bubbles) create bubble when hit space.
- cell sizing?



### MacOS tables