import { useState, useEffect } from "react";

import { parseActivitiesFromBody } from "../utils/activityParser";

// The email body is what was actually sent, so prefer it over the stored list.
export const reportActivities = (r) => {
  if (!r) return [];
  const parsed = parseActivitiesFromBody(r.body);
  return parsed.length ? parsed : r.activities || [];
};

function HistoryModal({ report, reports, onClose }) {
  const [selected, setSelected] = useState(report || (reports && reports[0]) || null);

  useEffect(() => {
    setSelected(report || (reports && reports[0]) || null);
  }, [report, reports]);

  if (!report && (!reports || reports.length === 0)) return null;

  const copyJSON = async (r) => {
    const payload = {
      date: r.date,
      project: r.project,
      activities: reportActivities(r),
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied JSON to clipboard");
    } catch (e) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Copied JSON to clipboard');
    }
  };

  const rList = reports || (report ? [report] : []);

  return (
    <div className="modal-overlay">
      <div className="history-modal">

        <div className="modal-header">
          <h2>📄 Status Report</h2>

          <button
            className="close-btn"
            onClick={() => { setSelected(null); onClose(); }}
          >
            ✖
          </button>
        </div>

        <div className="modal-content">

          {rList.length > 1 && (
            <div style={{marginBottom:16}}>
              <strong>Reports for selected date</strong>
              <ul style={{marginTop:8}}>
                {rList.map((rr) => (
                  <li key={rr.id} style={{marginBottom:8}}>
                    <span style={{marginRight:8}}>{rr.project} — {rr.date}</span>
                    <button className="view-btn" onClick={() => setSelected(rr)}>View</button>
                    <button style={{marginLeft:8}} className="view-btn" onClick={() => copyJSON(rr)}>Copy JSON</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected && (
            <>
              <div className="info-grid">

                <div>
                  <strong>Project</strong>
                  <p>{selected.project}</p>
                </div>

                <div>
                  <strong>Date</strong>
                  <p>{selected.date}</p>
                </div>

                <div>
                  <strong>Sent Time</strong>
                  <p>{selected.sentAt ? new Date(selected.sentAt).toLocaleTimeString() : ''}</p>
                </div>

              </div>

              <div style={{display:'flex', gap:8, marginBottom:12}}>
                <button className="view-btn" onClick={() => copyJSON(selected)}>Copy JSON</button>
              </div>

              <h3>Activities</h3>

              <ul className="activity-history-list">
                {reportActivities(selected).map((activity, index) => (
                  <li key={index}>{activity}</li>
                ))}
              </ul>

              <h3>Email Preview</h3>

              <textarea
                readOnly
                value={selected.body}
                className="history-email-preview"
              />
            </>
          )}

        </div>

      </div>
    </div>
  );
}

export default HistoryModal;