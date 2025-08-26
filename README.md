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
- 🎨 **Customizable** - Colors, sizes, and styles for every task
- 📱 **Responsive** - Works on desktop and mobile devices
- 🖱️ **Drag & Drop** - Intuitive task rescheduling
- 🔍 **Zoom In/Out** - Programmatic zoom controls and zoomChange event
- 📍 **Day Marking** - Highlight special days, holidays, or events (with events)
- 🏷️ **Y-Axis Labels** - Display work orders, assignees, and metadata
- 🌙 **Dark Mode** - Built-in dark theme support
- 🌐 **Locale & Formatting** - Set locale, date and time formats
- 🧭 **Date Range Control** - Configure min/max dates (auto-extends to fill view)
- 🧩 **Sidebar Improvements** - Custom sidebar title + resizable sidebar
- 💫 **Vue 3 Ready** - Easy integration with Vue 3 projects

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
import GanttChart from '@bentipe/gantt-chartmeleon';
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
        start: '2024-01-06',
        end: '2024-01-15',
        progress: 30,
        dependencies: ['1']
    }
];

gantt.setTasks(tasks);
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

const handleTaskClick = (task) => {
  console.log('Task clicked:', task);
};

const handleTaskDrop = ({ task, start, end }) => {
  console.log('Task moved:', task.name, start, end);
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
  start: '2024-01-01',       // Required: Start date
  end: '2024-01-05',         // Required: End date
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

gantt.on('taskClick', (task) => {
  console.log('Task clicked:', task);
});

gantt.on('taskMouseOver', ({ task, event }) => {
  console.log('Mouse over:', task.name, event.clientX, event.clientY);
});

gantt.on('taskMouseOut', ({ task, event }) => {
  console.log('Mouse out:', task.name);
});

gantt.on('taskDrag', ({ task, start, end }) => {
  console.log('Dragging:', task.name);
});

gantt.on('taskDrop', ({ task, start, end, originalStart, originalEnd }) => {
  console.log('Task dropped:', task.name);
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

## 🔒 Security

- No passwords, API keys, or other secrets are included in this repository. 
- Do not commit environment files or credentials. The repository .gitignore excludes common secret files (.env, .npmrc, .yarnrc.yml).
- To report a vulnerability or accidental exposure, please follow our [Security Policy](./SECURITY.md).
