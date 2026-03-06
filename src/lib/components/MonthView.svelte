<script lang="ts">
    import {
        getMonthOffset,
        setMonthOffset,
        getTasksForDate,
        addTask,
        toggleTask,
        deleteTask,
    } from "$lib/stores/app.svelte.js";
    import {
        todayISO,
        monthDates,
        monthLabel,
        monthStart,
        addMonths,
        isToday,
        isPast,
        dayLabel,
    } from "$lib/utils/dates.js";

    let offset = $derived(getMonthOffset());

    let refDate = $derived(() => {
        const today = todayISO();
        return addMonths(monthStart(today), offset);
    });

    let ref = $derived(refDate());
    let dates = $derived(monthDates(ref));
    let label = $derived(monthLabel(ref));

    // Group dates into weeks (rows of 7)
    let weeks = $derived(() => {
        const result: string[][] = [];
        for (let i = 0; i < dates.length; i += 7) {
            result.push(dates.slice(i, i + 7));
        }
        return result;
    });

    let weekRows = $derived(weeks());

    // Popover state
    let selectedDate = $state<string | null>(null);
    let popoverEl: HTMLDivElement | undefined = $state();
    let newTaskValue = $state("");
    let popoverInputEl: HTMLInputElement | undefined = $state();

    let selectedTasks = $derived(
        selectedDate ? getTasksForDate(selectedDate) : [],
    );
    let selectedLabel = $derived(selectedDate ? dayLabel(selectedDate) : "");

    // Check if a date is in the current display month
    function isCurrentMonth(date: string): boolean {
        return monthStart(date) === ref;
    }

    function getTaskCount(date: string): number {
        return getTasksForDate(date).filter((t) => !t.isCompleted).length;
    }

    function getCompletedCount(date: string): number {
        return getTasksForDate(date).filter((t) => t.isCompleted).length;
    }

    function prevMonth() {
        setMonthOffset(offset - 1);
        selectedDate = null;
    }

    function nextMonth() {
        setMonthOffset(offset + 1);
        selectedDate = null;
    }

    function goThisMonth() {
        setMonthOffset(0);
    }

    function selectDay(date: string) {
        if (selectedDate === date) {
            selectedDate = null;
        } else {
            selectedDate = date;
            newTaskValue = "";
            requestAnimationFrame(() => popoverInputEl?.focus());
        }
    }

    function closePopover() {
        selectedDate = null;
    }

    function handlePopoverKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closePopover();
        }
        if (e.key === "Enter" && newTaskValue.trim()) {
            addTask(newTaskValue.trim(), selectedDate);
            newTaskValue = "";
        }
    }
</script>

<div class="month-view">
    <div class="month-nav">
        <button onclick={prevMonth} class="nav-btn" aria-label="Previous month"
            >&larr;</button
        >
        <button
            onclick={goThisMonth}
            class="nav-btn month-label-btn"
            class:active={offset === 0}
        >
            {label}
        </button>
        <button onclick={nextMonth} class="nav-btn" aria-label="Next month"
            >&rarr;</button
        >
    </div>

    <div class="calendar-grid">
        <div class="day-headers">
            {#each ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as dayName}
                <div class="day-header-cell">{dayName}</div>
            {/each}
        </div>

        {#each weekRows as week}
            <div class="calendar-week">
                {#each week as date (date)}
                    {@const taskCount = getTaskCount(date)}
                    {@const completedCount = getCompletedCount(date)}
                    {@const inMonth = isCurrentMonth(date)}
                    {@const today = isToday(date)}
                    {@const past = isPast(date)}
                    <div class="calendar-day-wrapper">
                        <button
                            class="calendar-day"
                            class:today
                            class:past
                            class:outside={!inMonth}
                            class:selected={selectedDate === date}
                            class:has-tasks={taskCount > 0 ||
                                completedCount > 0}
                            onclick={() => selectDay(date)}
                        >
                            <span class="day-number"
                                >{parseInt(date.split("-")[2])}</span
                            >
                            {#if taskCount > 0 || completedCount > 0}
                                <div class="day-indicators">
                                    {#if taskCount > 0}
                                        <span class="task-dot pending"
                                            >{taskCount}</span
                                        >
                                    {/if}
                                    {#if completedCount > 0}
                                        <span class="task-dot done"
                                            >{completedCount}&#x2713;</span
                                        >
                                    {/if}
                                </div>
                            {/if}
                        </button>

                        {#if selectedDate === date}
                            <div
                                class="day-popover"
                                bind:this={popoverEl}
                                role="dialog"
                                aria-label="Tasks for {selectedLabel}"
                            >
                                <div class="popover-header">
                                    <span class="popover-date"
                                        >{selectedLabel}</span
                                    >
                                    <button
                                        class="popover-close"
                                        onclick={closePopover}
                                        aria-label="Close"
                                        >&#x2715;</button
                                    >
                                </div>

                                {#if selectedTasks.length > 0}
                                    <ul class="popover-tasks">
                                        {#each selectedTasks as task (task.id)}
                                            <li
                                                class="popover-task"
                                                class:completed={task.isCompleted}
                                            >
                                                <button
                                                    class="popover-check"
                                                    class:checked={task.isCompleted}
                                                    onclick={() =>
                                                        toggleTask(task.id)}
                                                    aria-label={task.isCompleted
                                                        ? "Uncomplete"
                                                        : "Complete"}
                                                >
                                                    {#if task.isCompleted}&#x2713;{/if}
                                                </button>
                                                <span class="popover-task-title"
                                                    >{task.title}</span
                                                >
                                                <button
                                                    class="popover-delete"
                                                    onclick={() =>
                                                        deleteTask(task.id)}
                                                    aria-label="Delete task"
                                                    >&#x2715;</button
                                                >
                                            </li>
                                        {/each}
                                    </ul>
                                {:else}
                                    <p class="popover-empty">No tasks yet</p>
                                {/if}

                                <div class="popover-input-row">
                                    <input
                                        bind:this={popoverInputEl}
                                        bind:value={newTaskValue}
                                        onkeydown={handlePopoverKeydown}
                                        placeholder="Add a task..."
                                        type="text"
                                        autocomplete="off"
                                    />
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/each}
    </div>
</div>

<!-- Close popover when clicking outside -->
{#if selectedDate}
    <div
        class="popover-backdrop"
        onclick={closePopover}
        role="presentation"
    ></div>
{/if}

<style>
    .month-view {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .month-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 16px 24px;
        border-bottom: 1px solid var(--border-light);
        background: var(--bg-surface);
        backdrop-filter: var(--glass);
        -webkit-backdrop-filter: var(--glass);
    }

    .nav-btn {
        padding: 6px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-secondary);
        transition: all var(--transition-fast);
        background: transparent;
    }

    .nav-btn:hover {
        background: var(--bg-hover);
        color: var(--text);
        transform: translateY(-1px);
    }

    .month-label-btn {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: var(--heading-green);
        min-width: 180px;
        text-align: center;
    }

    .month-label-btn.active {
        background: rgba(45, 106, 79, 0.1);
        color: var(--heading-green);
        box-shadow: inset 0 0 0 1px rgba(45, 106, 79, 0.2);
    }

    .calendar-grid {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 20px;
        gap: 4px;
    }

    .day-headers {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-light);
        margin-bottom: 8px;
    }

    .day-header-cell {
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        padding: 4px;
    }

    .calendar-week {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        flex: 1;
    }

    .calendar-day-wrapper {
        position: relative;
    }

    .calendar-day {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        gap: 4px;
        padding: 8px 4px;
        border-radius: 12px;
        background: var(--bg-surface);
        border: 1px solid transparent;
        transition: all var(--transition-fast);
        cursor: pointer;
        min-height: 60px;
        width: 100%;
    }

    .calendar-day:hover {
        background: var(--bg-hover);
        border-color: var(--border);
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
    }

    .calendar-day.today {
        border-color: var(--heading-green);
        background: rgba(45, 106, 79, 0.08);
        box-shadow: 0 0 12px rgba(45, 106, 79, 0.15);
    }

    .calendar-day.selected {
        border-color: var(--heading-green);
        background: rgba(45, 106, 79, 0.12);
        box-shadow: 0 0 0 2px rgba(45, 106, 79, 0.3);
    }

    .calendar-day.past {
        opacity: 0.6;
    }

    .calendar-day.past:hover,
    .calendar-day.past.selected {
        opacity: 1;
    }

    .calendar-day.outside {
        opacity: 0.3;
    }

    .calendar-day.outside:hover,
    .calendar-day.outside.selected {
        opacity: 0.6;
    }

    .day-number {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
    }

    .today .day-number {
        color: var(--heading-green);
        font-weight: 800;
    }

    .outside .day-number {
        color: var(--text-muted);
    }

    .day-indicators {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        justify-content: center;
    }

    .task-dot {
        font-size: 10px;
        font-weight: 700;
        font-family: var(--font-mono);
        padding: 1px 5px;
        border-radius: 8px;
    }

    .task-dot.pending {
        background: rgba(239, 68, 68, 0.15);
        color: var(--priority-must);
    }

    .task-dot.done {
        background: var(--success-soft);
        color: var(--success);
    }

    /* Popover */
    .popover-backdrop {
        position: fixed;
        inset: 0;
        z-index: 99;
    }

    .day-popover {
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        width: 280px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.2);
        padding: 16px;
        animation: popoverIn 0.15s ease-out;
    }

    @keyframes popoverIn {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    .popover-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-light);
    }

    .popover-date {
        font-size: 14px;
        font-weight: 700;
        color: var(--heading-green);
    }

    .popover-close {
        width: 24px;
        height: 24px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: var(--text-muted);
    }

    .popover-close:hover {
        background: var(--bg-hover);
        color: var(--text);
    }

    .popover-tasks {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 12px;
    }

    .popover-task {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 4px;
        border-radius: 8px;
        transition: background var(--transition-fast);
    }

    .popover-task:hover {
        background: var(--bg-hover);
    }

    .popover-task.completed .popover-task-title {
        text-decoration: line-through;
        opacity: 0.5;
    }

    .popover-check {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        border: 2px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        flex-shrink: 0;
        color: transparent;
        transition: all var(--transition-fast);
    }

    .popover-check.checked {
        background: var(--success);
        border-color: var(--success);
        color: #fff;
    }

    .popover-check:hover {
        border-color: var(--heading-green);
    }

    .popover-task-title {
        font-size: 13px;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .popover-delete {
        font-size: 10px;
        color: var(--text-muted);
        opacity: 0;
        transition: opacity var(--transition-fast);
        padding: 4px;
    }

    .popover-task:hover .popover-delete {
        opacity: 1;
    }

    .popover-delete:hover {
        color: var(--priority-must);
    }

    .popover-empty {
        font-size: 13px;
        color: var(--text-muted);
        text-align: center;
        padding: 12px 0;
        font-style: italic;
    }

    .popover-input-row input {
        width: 100%;
        font-size: 13px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.03);
        border: 1px solid var(--border-light);
        border-radius: 8px;
        transition: all var(--transition-fast);
    }

    .popover-input-row input:focus {
        border-color: var(--heading-green);
        box-shadow: 0 0 0 2px rgba(45, 106, 79, 0.15);
    }

    .popover-input-row input::placeholder {
        color: var(--text-placeholder);
    }
</style>
