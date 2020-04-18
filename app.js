const createNewElement = () => ({
  id: uuidv4(),
  text: ' ',
  styles: {
    color: '#333',
    backgroundColor: '#fff',
    fontSize: '16px',
  },
})

Vue.component('v-editor-element', {
  template: `
  <span
  contenteditable
  class="v-editor__element"
  :class="{ selected }"
  v-text="element.text"
  :style="element.styles"
  :data-id="element.id"
  @click="$emit('selected')"
  @blur="onBlur"
  >
  </span>
  `,
  props: {
    element: {
      type: Object,
    },
    selected: {
      type: Boolean,
    },
  },
  mounted() {
    this.$root.$on('delete-event', this.deleteListener)
  },
  beforeDestroy() {
    this.$root.$off('delete-event', this.deleteListener)
  },
  methods: {
    deleteListener(e) {
      if (e.id === this.element.id) {
        const textLength = this.$el.innerText.length
        switch (textLength) {
          case 0:
            this.$emit('remove')
            break
          case 1:
            this.element.text = ' '
            break
        }
      }
    },
    onBlur(e) {
      this.element.text = e.target.innerText
    },
  },
})

Vue.component('v-editor', {
  data() {
    return {
      elements: [],
      selectedElement: null,
    }
  },
  template: `<div class="v-editor">
  <div class="v-editor__tools">
    <button @click="addItem">Add item</button>
    <button @click="exportJson">Export JSON to console</button>

    <div v-if="selectedElement" class="mt-2">
      <div class="form-item">
        Color: <input type="text" v-model="selectedElement.styles.color" />
      </div>
      <div class="form-item">
        Background color: <input type="text" v-model="selectedElement.styles.backgroundColor" />
      </div>
      <div class="form-item">
        Font size: <input type="text" v-model.lazy="selectedElement.styles.fontSize" />
      </div>
    </div>
  </div>

  <div @keypress="onKeypress" @keydown="onInput">
    <template v-for="item in elements">
      <template v-if="item.text">
        <v-editor-element
        ref="elements"
        :element="item"
        :selected="selectedElement === item"
        @remove="onRemove(item.id)"
        @selected="onSelected(item.id)"
        />
      </template>
      <template v-else-if="item.newLine">
        <br>
      </template>
    </template>
    </div>
  </div>`,
  methods: {
    onInput(e) {
      if (['Backspace', 'Delete'].includes(e.key)) {

        const focusNode = window.getSelection().focusNode

        if (focusNode.parentElement.classList.contains('v-editor__element'))
          this.$root.$emit('delete-event', {
            e,
            id: focusNode.parentElement.attributes['data-id'].value,
          })
        else
          this.$root.$emit('delete-event', {
            e,
            id: focusNode.attributes['data-id'].value,
          })

        // e.preventDefault()
      }
    },
    onRemove(id) {
      if (this.elements.filter(el => el.text).length < 2)
        return

      this.elements = this.elements.filter(el => el.newLine || el.id !== id)

      this.checkEmptyElements()

      this.$nextTick(() => {
        this.focusOnLastElement()
      })
    },
    onSelected(id) {
      this.selectedElement = this.elements.find(el => el.id === id)
    },
    addItem() {
      const item = createNewElement()

      this.elements.push(item)

      this.selectedElement = item

      this.checkEmptyElements()

      this.$nextTick(() => {
        this.focusOnLastElement()
      })
    },
    checkEmptyElements() {
      let emptyElementIds = []

      this.elements.forEach((element, i) => {
        i !== this.elements.length - 1
        && 'text' in element
        && !element.text.trim().length
        && 'text' in this.elements[i + 1]
        && !this.elements[i + 1].text.trim().length
        && emptyElementIds.push(element.id)
      })

      const selectedId = this?.selectedElement?.id

      if (this.elements.filter(el => el.id).length > 1)
        this.elements = this.elements.filter(el => el.newLine || !emptyElementIds.includes(el.id) || selectedId === el.id)

      let duplicateLineBreakIndexes = []

      this.elements.forEach((element, i) => {
        i !== this.elements.length - 1
        && element.newLine
        && this.elements[i + 1].newLine
        && duplicateLineBreakIndexes.push(i)
      })

      this.elements = this.elements.filter((el, i) => !duplicateLineBreakIndexes.includes(i))
    },
    onKeypress(e) {
      if (e.key === 'Enter') {
        e.preventDefault()

        const item = createNewElement()

        this.elements.push({ newLine: true }, item)

        this.selectedElement = item

        this.$nextTick(() => {
          this.focusOnLastElement()
        })
      }
    },
    focusOnLastElement() {
      const lastElement = _.last(this.$refs.elements)
      const el = lastElement.$el

      const s = window.getSelection()
      const r = document.createRange()

      r.setStart(el, 0)
      r.setEnd(el, 0)

      s.removeAllRanges()
      s.addRange(r)

      this.selectedElement = lastElement.element
    },
    focusOnElementById(id) {
      const element = this.$refs.elements.find(el => el.element.id === id)
      const el = element.$el

      const s = window.getSelection()
      const r = document.createRange()

      r.setStart(el, 0)
      r.setEnd(el, 0)

      s.removeAllRanges()
      s.addRange(r)

      this.selectedElement = element.element
    },
    exportJson() {
      const toExport = _.cloneDeep(this.elements)
      let hasDuplicateStyles = this.hasDuplicateStyles(toExport)

      while (hasDuplicateStyles.res) {
        this.mergeDuplicateStyles(toExport, hasDuplicateStyles.i)

        hasDuplicateStyles = this.hasDuplicateStyles(toExport)
      }

      console.log(JSON.stringify(toExport, undefined, 2))
    },
    hasDuplicateStyles(elements) {
      let hasDuplicateStyles = false

      for (let i = 0; i < elements.length - 1; i++) {
        let el = elements[i]
        let nextEl = elements[i + 1]

        if (el.text && nextEl.text && _.isEqual(el.styles, nextEl.styles))
          return { res: true, i }
      }

      return { res: false }
    },
    mergeDuplicateStyles(elements, i) {
      elements[i].text += elements[i + 1].text
      elements.splice(i + 1, 1)
    },
  },
})

const app = new Vue({
  el: '#app',
})
