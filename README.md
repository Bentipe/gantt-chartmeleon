# 📊 Gantt Chartmeleon Library

Caution, made with AI.

A modern, feature-rich Gantt chart library for JavaScript with Vue 3 support. Build beautiful project timelines with ease.

![npm version](https://img.shields.io/npm/v/@bentipe/gantt-chartmeleon)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE.md)

## ✨ Features

- 📅 **Multiple View Modes** - Hours, Days, Weeks, and Months
- 🎯 **Task Management** - Create, update, and delete tasks
- 🔗 **Dependencies** - Visual task dependencies with arrows + programmatic API
- 📁 **Collapsible Groups** - Organize tasks into collapsible groups; expand/collapse all
- 🗂️ **Nested Groups** - Groups inside groups with hierarchical sidebar indentation
- 🎨 **Customizable** - Colors, sizes, and styles for every task
- 📱 **Responsive** - Works on desktop and mobile devices
- 🖱️ **Drag & Drop** - Intuitive task rescheduling
- 🧩 **Segmented Tasks** - Multiple segments per task (each with its own start/end and name), draggable independently
- 🔍 **Zoom In/Out** - Programmatic zoom controls and zoomChange event
- 📍 **Day Marking** - Highlight special days, holidays, or events (with events)
- 🏷️ **Y-Axis Labels** - Display work orders, assignees, and metadata
- 🌙 **Dark Mode** - Built-in dark theme support
- 🌐 **Locale & Formatting** - Set locale, date and time formats
- 🧭 **Date Range Control** - Configure min/max dates (auto-extends to fill view)
- 🔁 **Infinite Horizontal Scroll** - Seamlessly extends time range as you scroll left/right
- 🧩 **Sidebar Improvements** - Custom sidebar title + resizable sidebar
- 💫 **Vue 3 Ready** - Easy integration with Vue 3 projects

Note: Tasks operate via a segments-only model (except milestones). Each task must have one or more segments. If you pass task-level start/end only, the library will internally convert them into a single segment and compute the task’s overall start/end from its segments.

## 📦 Installation

```bash
npm install @bentipe/gantt-chartmeleon
```

Or with yarn:

```bash
yarn add @bentipe/gantt-chartmeleon
```

## 🚀 Quick Start

### Vanilla JavaScript

```javascript
import { GanttChart } from '@bentipe/gantt-chartmeleon';
import '@bentipe/gantt-chartmeleon/dist/gantt-chartmeleon.css';

// Create instance
const gantt = new GanttChart('#gantt-container', {
    viewMode: 'day',
    enableDragDrop: true,
    showSidebar: true
});

// Add tasks
const tasks = [
    {
        id: '1',
        name: 'Project Planning',
        start: '2024-01-01',
        end: '2024-01-05',
        progress: 75,
        color: '#4CAF50'
    },
    {
        id: '2',
        name: 'Development',
        // Example of a segmented task
        segments: [
          { name: 'Sprint 1', start: '2024-01-06', end: '2024-01-08' },
          { name: 'Sprint 2', start: '2024-01-10', end: '2024-01-12' }
        ],
        progress: 30,
        color: '#2196F3',
        dependencies: ['1']
    }
];

// Optional: define groups (supports nested groups via parent)
const groups = [
  { id: 'planning', name: 'Planning' },
  { id: 'development', name: 'Development' },
  { id: 'dev-backend', name: 'Backend', parent: 'development' },
  { id: 'dev-frontend', name: 'Frontend', parent: 'development' }
];

// Pass groups as second argument
gantt.setTasks(tasks, groups);
```

### Vue 3 Component

```vue
<template>
  <GanttChart
    :tasks="tasks"
    :groups="groups"
    :options="options"
    @task-click="handleTaskClick"
    @task-drop="handleTaskDrop"
  />
</template>

<script setup>
import { GanttChart } from '@bentipe/gantt-chartmeleon/vue';
import '@bentipe/gantt-chartmeleon/dist/gantt-chartmeleon.css';

const tasks = ref([
  // Your tasks
  // Example segmented task
  {
    id: 'frontend',
    name: 'Frontend Development',
    segments: [
      { name: 'FE Sprint 1', start: '2025-08-26', end: '2025-08-28' },
      { name: 'FE Sprint 2', start: '2025-08-29', end: '2025-08-31' }
    ],
    color: '#2196F3'
  }
]);

const groups = ref([
  {
    id: 'phase-1',
    name: 'Phase 1: Planning'
  }
]);

const options = {
  viewMode: 'day',
  enableDragDrop: true
};

// For segmented tasks, payload may be { task, segmentIndex }
const handleTaskClick = (payload) => {
  if (payload && payload.task) {
    const { task, segmentIndex } = payload;
    console.log('Task clicked:', task.name, segmentIndex != null ? `(segment ${segmentIndex})` : '');
  } else {
    console.log('Task clicked:', payload?.name);
  }
};

const handleTaskDrop = ({ task, start, end, segmentIndex }) => {
  console.log('Task moved:', task.name, segmentIndex != null ? `(segment ${segmentIndex})` : '', start, end);
};
</script>
```

## 📖 API Documentation

### Constructor Options

```javascript
const options = {
  viewMode: 'day',        // 'hour' | 'day' | 'week' | 'month'
  minDate: null,          // Optional: min bound for visible date range
  maxDate: null,          // Optional: max bound for visible date range
  rowHeight: 40,          // Height of each row
  headerHeight: 50,       // Height of the header
  columnWidth: 30,        // Width of each column
  taskMinWidth: 40,       // Minimum width for tasks
  enableDragDrop: true,   // Enable drag and drop
  showSidebar: true,      // Show task labels sidebar
  sidebarWidth: 200,      // Initial sidebar width
  sidebarTitle: 'Tasks',  // Sidebar header title
  locale: 'en-US',        // Intl locale for formatting
  dateFormat: 'YYYY-MM-DD', // Date formatting pattern
  timeFormat: 'HH:mm',    // Time formatting pattern
  theme: 'default'        // 'default' | 'dark'
};
```

### Task Properties

```javascript
const task = {
  id: 'unique-id',           // Required: Unique identifier
  name: 'Task Name',         // Required: Display name
  // Segments-only model: tasks operate via segments (1..N). If you pass start/end, they will be converted to a single segment.
  // start/end are ignored as authoritative values and always derived from segments.
  // You can still seed a single segment by providing start/end.
  start: '2024-01-01',       // Optional: used only to seed a single segment
  end: '2024-01-05',         // Optional: used only to seed a single segment
  segments: [                // Required for multi-part tasks; if omitted, a single segment will be created from start/end or defaulted
    {
      id: 'seg-1',
      name: 'Phase A',
      start: '2024-01-01',
      end: '2024-01-03',
      color: '#2196F3',      // Optional: segment color (defaults to task color)
      metadata: {}           // Optional: any custom data on segment
    }
  ],
  progress: 50,              // Optional: Progress percentage (0-100)
  color: '#2196F3',          // Optional: Task color
  dependencies: ['task-1'],  // Optional: Array of task IDs
  group: 'group-1',          // Optional: Group ID
  workOrder: 'WO-2024-001',  // Optional: Work order number
  assignee: 'John Doe',      // Optional: Assigned person
  type: 'task',              // Optional: 'task' | 'milestone'
  metadata: {}               // Optional: Custom data
};
```

Notes:
- Tasks operate via segments only. The task’s overall start/end are always computed as the min/max over its segments.
- If a task is provided with only start/end, it will be converted into a single-segment task internally.

### Segmented Tasks

A task can be split into multiple segments, each with its own start, end, and name. Segments are rendered as separate bars on the same row and can be dragged independently. When a segment is moved, the task’s overall start/end are recalculated as the min/max of its segments.

- Data model: provide a `segments` array on the task (see Task Properties above).
- Colors: a segment can define its own color; otherwise it inherits the task color.
- Events: taskClick/taskMouseOver/taskMouseOut/taskDrag/taskDrop include `segmentIndex` when the interaction targets a segment.
- Custom CSS per segment: you can add `className` (string, can include multiple classes) and/or `style` (string or object) to a segment to style it individually. The class/style are applied to the segment's SVG group, so you can target its bar via `.gantt-task-segment.your-class .gantt-task-bar`.

Example:

```js
const task = {
  id: 'frontend',
  name: 'Frontend Development',
  color: '#2196F3',
  segments: [
    { name: 'FE Sprint 1', start: '2025-08-26', end: '2025-08-28' },
    { name: 'FE Sprint 2', start: '2025-08-29', end: '2025-08-31', className: 'highlighted-seg', style: 'filter: drop-shadow(0 0 4px rgba(0,0,0,0.3))' }
  ]
};

/* CSS */
.gantt-task-segment.highlighted-seg .gantt-task-bar {
  stroke: #FF5722;
  stroke-width: 3px;
}
```

### Group Properties

```javascript
const group = {
  id: 'group-1',            // Required: Unique identifier
  name: 'Group Name',       // Required: Display name
  workOrder: 'WO-2024-100', // Optional: Work order number
  color: '#607D8B',         // Optional: Group color
  metadata: {},             // Optional: Custom data
  parent: null              // Optional: Parent group ID (supports nested groups)
};
```

### Methods

#### Task Management

```javascript
// Set all tasks at once
gantt.setTasks(tasks, groups);

// Add a single task
const newTask = gantt.addTask({
  name: 'New Task',
  start: '2024-01-01',
  end: '2024-01-05'
});

// Update a task
gantt.updateTask('task-id', {
  progress: 100,
  color: '#4CAF50'
});

// Remove a task
gantt.removeTask('task-id');

// Get a specific task
const task = gantt.getTask('task-id');

// Get all tasks
const allTasks = gantt.getTasks();
```

#### Group Management

```javascript
// Add a group
const group = gantt.addGroup({
  name: 'Phase 1',
  workOrder: 'WO-001'
});

// Remove a group
gantt.removeGroup('group-id');

// Toggle group collapse/expand
gantt.toggleGroup('group-id');

// Expand/collapse all groups
gantt.expandAll();
gantt.collapseAll();
```

#### View Management

```javascript
// Change view mode
gantt.setViewMode('week');

// Get visible tasks
const visible = gantt.getVisibleTasks();

// Get date range
const { start, end } = gantt.getDateRange();
```

Note: getVisibleTasks returns an array of visible items in order. For grouped views, each item has `type: 'task' | 'group'`, `data`, and may include a `depth` number indicating indentation for nested groups.

#### Zoom

```javascript
// Get current zoom (column width in px)
const current = gantt.getZoom();

// Set absolute zoom (clamped internally)
gantt.setZoom(40);

// Relative zoom controls
gantt.zoomIn();   // default step = 5px
gantt.zoomOut(10); // custom step

// Listen to zoom changes
gantt.on('zoomChange', ({ columnWidth }) => {
  console.log('Zoom changed. Column width:', columnWidth);
});
```

#### Scrolling

```javascript
// Scroll horizontally so that a given date is visible
// Options:
// - align: 'start' | 'center' | 'end' (default: 'center')
// - behavior: 'auto' | 'smooth' (default: 'auto')
// - paddingColumns: number of extra columns to extend when the target date is out of range (default: 2)
gantt.scrollToDate(new Date('2025-08-26'), { align: 'center', behavior: 'smooth', paddingColumns: 2 });

// Convenience: scroll to today
gantt.scrollToToday({ align: 'center', behavior: 'smooth' });

// Notes:
// - If the target date is outside the current [minDate, maxDate], the chart will extend the range
//   (left and/or right) and re-render, preserving vertical scroll position.
// - Emits events:
//     'rangeExtend' -> { direction: 'left' | 'right' | 'both', from: Date, to: Date }
//     'scrollToDate' -> { date: Date, align: 'start' | 'center' | 'end' }
```

#### Day Marking

```javascript
// Mark a special day
gantt.markDay('2024-01-01', 'holiday', '#ff0000');

// Unmark a day
gantt.unmarkDay('2024-01-01');

// Clear all marked days
gantt.clearMarkedDays();
```

#### Dependencies

```javascript
// Set dependencies (array of relations)
// Example format is flexible; typically pair of task IDs or objects
const dependencies = [
  { from: '1', to: '2', type: 'FS' }, // Finish-to-Start
  { from: '2', to: '3', type: 'SS' }
];

gantt.setDependencies(dependencies);
```

### Events

```javascript
// Task events
gantt.on('tasksSet', ({ tasks, groups }) => {
  console.log('Tasks set:', tasks.length, 'Groups:', groups.length);
});

// Note: taskClick payload can be either the task (for non-segmented)
// or { task, segmentIndex } when a segment is clicked.
// segmentIndex is 0-based when present.
gantt.on('taskClick', (payload) => {
  if (payload && payload.task) {
    const { task, segmentIndex } = payload;
    console.log('Task clicked:', task.name, segmentIndex != null ? `(segment ${segmentIndex})` : '');
  } else if (payload) {
    console.log('Task clicked:', payload.name);
  }
});

// Mouse over/out also include segmentIndex when applicable
gantt.on('taskMouseOver', ({ task, segmentIndex, event }) => {
  console.log('Mouse over:', task.name, segmentIndex != null ? `(segment ${segmentIndex})` : '', event.clientX, event.clientY);
});

gantt.on('taskMouseOut', ({ task, segmentIndex, event }) => {
  console.log('Mouse out:', task.name, segmentIndex != null ? `(segment ${segmentIndex})` : '');
});

// Drag events include segmentIndex for segmented tasks
gantt.on('taskDrag', ({ task, start, end, segmentIndex }) => {
  console.log('Dragging:', task.name, segmentIndex != null ? `(segment ${segmentIndex})` : '', 'to', start, end);
});

// Drop event includes originalStart/originalEnd and segmentIndex
gantt.on('taskDrop', ({ task, start, end, originalStart, originalEnd, segmentIndex }) => {
  console.log('Task dropped:', task.name, segmentIndex != null ? `(segment ${segmentIndex})` : '', 'from', originalStart, originalEnd, 'to', start, end);
});

gantt.on('taskAdd', (task) => {
  console.log('Task added:', task);
});

gantt.on('taskUpdate', (task) => {
  console.log('Task updated:', task);
});

gantt.on('taskRemove', (task) => {
  console.log('Task removed:', task);
});

// Group events
gantt.on('groupAdd', (group) => {
  console.log('Group added:', group);
});

gantt.on('groupRemove', (group) => {
  console.log('Group removed:', group);
});

gantt.on('groupClick', (group) => {
  console.log('Group clicked:', group);
});

gantt.on('groupCollapse', (groupId) => {
  console.log('Group collapsed:', groupId);
});

gantt.on('groupExpand', (groupId) => {
  console.log('Group expanded:', groupId);
});

gantt.on('expandAll', () => {
  console.log('All groups expanded');
});

gantt.on('collapseAll', () => {
  console.log('All groups collapsed');
});

// View events
gantt.on('viewModeChange', (mode) => {
  console.log('View mode changed to:', mode);
});

gantt.on('zoomChange', ({ columnWidth }) => {
  console.log('Zoom changed to column width:', columnWidth);
});

// Scrolling / infinite range events
gantt.on('rangeExtend', ({ direction, from, to }) => {
  console.log('Range extended:', direction, 'from', from, 'to', to);
});

gantt.on('scrollToDate', ({ date, align }) => {
  console.log('Scrolled to date:', date, 'align:', align);
});

// Day marking events
gantt.on('dayMarked', ({ date, type, color }) => {
  console.log('Day marked:', date, type, color);
});

gantt.on('dayUnmarked', ({ date }) => {
  console.log('Day unmarked:', date);
});

gantt.on('markedDaysCleared', () => {
  console.log('All marked days cleared');
});

// Dependencies
gantt.on('dependenciesSet', (deps) => {
  console.log('Dependencies set:', deps);
});

// Remove event listener
gantt.off('taskClick', handler);

// Remove all listeners for an event
gantt.off('taskClick');
```

## 🎨 Theming

### Built-in Themes

```javascript
// Light theme (default)
const gantt = new GanttChart('#container', {
  theme: 'default'
});

// Dark theme
const gantt = new GanttChart('#container', {
  theme: 'dark'
});
```

### Custom Styling

Override CSS variables for custom theming:

```css
.gantt-container {
  --gantt-primary-color: #2196F3;
  --gantt-header-bg: #f8f9fa;
  --gantt-border-color: #e0e0e0;
  --gantt-row-height: 40px;
  --gantt-font-family: 'Inter', sans-serif;
}
```

## 🧪 Demo

A live demo is included in the repo under the demo/ folder and showcases:
- Nested groups (groups inside groups) with hierarchical indentation
- Collapsing/expanding groups, including ancestors hiding all descendants
- Segmented tasks: tasks with multiple independent segments (each segment has its own start/end and name)
- Controls: Add Task, Add Group, Add Subgroup, Toggle Theme, Expand All, Collapse All, Zoom, Today

Note: The Add Task button always creates a segmented task with 1–8 segments to demonstrate the segments-only model.

How to run locally:

```bash
npm install
npm run dev
# then open the demo at /demo/index.html via the dev server
```

Tip: You can also open demo/index.html directly in a modern browser for a quick preview.

## 🔧 Development

### Setup

```bash
# Clone the repository
git clone https://github.com/Bentipe/gantt-chartmeleon.git

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build

```bash
# Build library
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
gantt-chart/
├── src/
│   ├── gantt-chartmeleon.js      # Main library
│   ├── gantt-chartmeleon.css     # Styles
│   ├── index.d.ts                # TypeScript definitions
│   └── vue/
│       └── GanttChartmeleon.vue  # Vue 3 component
├── demo/
│   └── index.html          # Demo page
├── dist/                   # Built files
├── vite.config.js          # Build configuration
└── package.json
```

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/Bentipe/gantt-chartmeleon/issues) with a detailed description and reproduction steps.
