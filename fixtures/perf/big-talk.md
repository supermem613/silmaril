# Silmaril 50-region performance fixture

<!-- region: 01 type=text -->
The opening paragraph introduces the benchmark topic with enough prose to exercise parsing and layout heuristics.

<!-- region: 02 type=text -->
This second paragraph focuses on pacing, readability, and a balanced cadence for repeated rendering passes.

<!-- region: 03 type=text -->
A short paragraph keeps the fixture compact while still exercising text segmentation across multiple blocks.

<!-- region: 04 type=text -->
Longer examples add content variety so the parser sees mixed sentence structure and punctuation patterns.

<!-- region: 05 type=text -->
A brief narrative sentence helps verify selective rendering around ordinary prose content.

<!-- region: 06 type=text -->
Another prose block makes the fixture feel like a real presentation rather than a synthetic placeholder.

<!-- region: 07 type=text -->
The next region highlights repeated words, emphasis tokens, and common markdown punctuation.

<!-- region: 08 type=text -->
This paragraph includes a quoted phrase to ensure text normalization remains stable under varied input.

<!-- region: 09 type=text -->
A line break and a follow-up sentence create additional complexity without making the benchmark noisy.

<!-- region: 10 type=text -->
The tenth region is still plain text but carries enough length to influence layout spacing decisions.

<!-- region: 11 type=text -->
A modest paragraph continues the progression and keeps the benchmark dense enough for repeatability.

<!-- region: 12 type=text -->
This region adds a practical example that feels conversational rather than mechanical.

<!-- region: 13 type=text -->
A compact paragraph demonstrates that short blocks also contribute useful parse work.

<!-- region: 14 type=text -->
The fourteenth region includes a parenthetical aside to further diversify token boundaries.

<!-- region: 15 type=text -->
A mid-fixture paragraph introduces a subtle shift in topic while remaining easy to read.

<!-- region: 16 type=text -->
This region carries a more declarative style and provides additional line-level variation.

<!-- region: 17 type=text -->
The seventeenth region balances detail and brevity so the benchmark stays focused.

<!-- region: 18 type=text -->
Another prose block helps stress text aggregation without introducing excessive complexity.

<!-- region: 19 type=text -->
The nineteenth region is deliberately plain to keep the fixture canonical and deterministic.

<!-- region: 20 type=text -->
The final text region closes the prose portion before the fixture moves into code and media blocks.

<!-- region: 21 type=code -->
```js
const title = 'silmaril benchmark';
console.log(title);
```

<!-- region: 22 type=code -->
```ts
function greet(name: string) {
  return `hello ${name}`;
}
```

<!-- region: 23 type=code -->
```json
{ "theme": "cards", "mode": "bench" }
```

<!-- region: 24 type=code -->
```bash
echo "rendering benchmark"
```

<!-- region: 25 type=code -->
```python
value = 42
print(value)
```

<!-- region: 26 type=code -->
```css
.card { display: grid; gap: 1rem; }
```

<!-- region: 27 type=code -->
```html
<div class="card">Silmaril</div>
```

<!-- region: 28 type=code -->
```yaml
steps:
  - parse
  - layout
```

<!-- region: 29 type=code -->
```sql
SELECT name FROM regions WHERE count > 1;
```

<!-- region: 30 type=code -->
```jsx
export const note = <span>bench</span>;
```

<!-- region: 31 type=image -->
![atlas](https://example.com/atlas.png)

<!-- region: 32 type=image -->
![diagram](https://example.com/diagram.png)

<!-- region: 33 type=image -->
![overview](https://example.com/overview.png)

<!-- region: 34 type=image -->
![timeline](https://example.com/timeline.png)

<!-- region: 35 type=image -->
![gallery](https://example.com/gallery.png)

<!-- region: 36 type=image -->
![map](https://example.com/map.png)

<!-- region: 37 type=image -->
![scene](https://example.com/scene.png)

<!-- region: 38 type=image -->
![chart](https://example.com/chart.png)

<!-- region: 39 type=image -->
![panel](https://example.com/panel.png)

<!-- region: 40 type=image -->
![hero](https://example.com/hero.png)

<!-- region: 41 type=group parent=1 -->
- Group alpha
  - Child alpha
  - Child beta

<!-- region: 42 type=group parent=2 -->
- Group beta
  - Child gamma
  - Child delta

<!-- region: 43 type=group parent=3 -->
> Nested quote for the benchmark
> More nested detail for layout and assembly

<!-- region: 44 type=group parent=4 -->
1. Group one
   1. Child one
   2. Child two

<!-- region: 45 type=group parent=5 -->
- Group two
  - Child three
    - Child four

<!-- region: 46 type=group parent=6 -->
- Group three
  - Child five
  - Child six

<!-- region: 47 type=group parent=7 -->
> Deeply nested quote
> Another nested line

<!-- region: 48 type=group parent=8 -->
- Group four
  - Child seven
  - Child eight

<!-- region: 49 type=group parent=9 -->
1. Group five
   1. Child nine
   2. Child ten

<!-- region: 50 type=group parent=10 -->
- Group six
  - Child eleven
  - Child twelve
