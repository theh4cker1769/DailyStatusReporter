import { useEffect, useState } from "react";
import Header from "../components/Header";
import HistoryModal, { reportActivities } from "../components/HistoryModal";

function History() {
    const [history, setHistory] = useState([]);
    const [modalData, setModalData] = useState(null); // { report } or { reports }
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        fetch("http://localhost:5000/history")
            .then((res) => res.json())
            .then((data) => setHistory(data))
            .catch(console.error);
    }, []);

    // parse report.date which is in DD/MM/YYYY
    const reportDateObj = (r) => {
        if (!r || !r.date) return null;
        const parts = r.date.split("/");
        if (parts.length !== 3) return null;
        const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
        return new Date(yyyy, mm - 1, dd);
    };

    // map dates (YYYY-MM-DD) to reports
    const reportsByDay = {};
    history.forEach((r) => {
        const d = reportDateObj(r);
        if (!d || Number.isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        if (!reportsByDay[key]) reportsByDay[key] = [];
        reportsByDay[key].push(r);
    });

    const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const getCalendarMatrix = (date) => {
        const start = startOfMonth(date);
        // find first day shown (Sunday of the first week)
        const startDay = new Date(start);
        startDay.setDate(start.getDate() - start.getDay());

        // build 6 weeks x 7 days grid for stability
        const matrix = [];
        let cursor = new Date(startDay);
        for (let w = 0; w < 6; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                week.push(new Date(cursor));
                cursor.setDate(cursor.getDate() + 1);
            }
            matrix.push(week);
        }
        return matrix;
    };

    const monthDone = (cursor, date) => cursor.getMonth() !== date.getMonth();

    const prevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

    const weeks = getCalendarMatrix(currentMonth);

    const handleDayClick = (day) => {
        const key = day.toISOString().slice(0, 10);
        const reports = reportsByDay[key] || [];
        if (reports.length) setModalData({ reports, day });
    };

    const copyMonth = async () => {
        const month = currentMonth.getMonth();
        const year = currentMonth.getFullYear();
        const results = history.filter((r) => {
            const d = reportDateObj(r);
            return d && d.getMonth() === month && d.getFullYear() === year;
        }).map((r) => ({ date: r.date, project: r.project, activities: reportActivities(r) }));

        const text = JSON.stringify(results, null, 2);
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied month JSON to clipboard');
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            alert('Copied month JSON to clipboard');
        }
    };

    return (
        <div className="dashboard">
            <Header />

            <div className="history-container">
                <h2>📜 Report History — Calendar View</h2>

                <div className="calendar-header">
                    <button className="nav-btn" onClick={prevMonth}>◀</button>
                    <div className="month-label">{currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                    <button className="nav-btn" onClick={nextMonth}>▶</button>
                    <button className="nav-btn" style={{marginLeft:12}} onClick={copyMonth}>Copy Month</button>
                </div>

                <div className="calendar-grid">
                    <div className="calendar-row calendar-weekdays">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                            <div key={d} className="calendar-cell weekday">{d}</div>
                        ))}
                    </div>

                    {weeks.map((week, wi) => (
                        <div key={wi} className="calendar-row">
                            {week.map((day) => {
                                const inMonth = day.getMonth() === currentMonth.getMonth();
                                const key = day.toISOString().slice(0,10);
                                const hasReports = reportsByDay[key] && reportsByDay[key].length > 0;
                                return (
                                    <div
                                        key={key}
                                        className={`calendar-cell day ${inMonth ? '' : 'muted'}`}
                                        onClick={() => handleDayClick(day)}
                                    >
                                        <div className="day-number">{day.getDate()}</div>
                                        {hasReports && <div className="tick">✓</div>}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>

                <p style={{marginTop:12,color:'#475569'}}>Click on a date with a tick to view reports and copy JSON.</p>
            </div>

            <HistoryModal
                reports={modalData ? modalData.reports : null}
                onClose={() => setModalData(null)}
            />
        </div>
    );
}

export default History;