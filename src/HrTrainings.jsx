import { Link } from 'react-router-dom';
import React, { useState } from "react";
import { NavLink } from "react-router-dom";



function HrTrainings() {
      const [showAdd, setShowAdd] = useState(false);
      const [form, setForm] = useState({
        title: "",
        venue: "",
        date: "",
        time: ""
      });
      const [upcoming, setUpcoming] = useState([
        { title: "Defensive Driving Training", venue: "Pasig Roadwise", date: "June 12, 2025", time: "10:00 AM" },
        { title: "Company Orientation", venue: "Pasig Roadwise", date: "June 15, 2025", time: "1:00 PM" }
      ]);
      const [showParticipants, setShowParticipants] = useState(false);
      const [selected, setSelected] = useState(null);
      const [showCompletedParticipants, setShowCompletedParticipants] = useState(false);
      const [completedEditMode, setCompletedEditMode] = useState(false);
      const [showEdit, setShowEdit] = useState(false);
      const [editIndex, setEditIndex] = useState(null);
      const [editForm, setEditForm] = useState({ title: "", venue: "", date: "", time: "" });
      const [attendeeInputEdit, setAttendeeInputEdit] = useState("");
      const [attendeesEdit, setAttendeesEdit] = useState([]);
      const sampleDescription = "Gmeet link: : https://meet.google.com/landing?pli=1\nMeet link code: a5Gh7t";
      const sampleAttendees = [
        "Dela cruz, Juan",
        "Villanueva, Mark",
        "Manalo, Jose",
        "Santos, Maria",
        "Panares, Franco",
        "Estilla, Paulo",
        "Santiago, Paul",
        "Cane, Jack"
      ];
      const [attendeeInput, setAttendeeInput] = useState("");
      const [attendees, setAttendees] = useState([]);
      const completed = [
        { title: "Excel & Advanced Spreadsheets", venue: "Google Meet (Online)", date: "June 3, 2025", time: "10:00 AM" },
        { title: "Health, Safety, and Emergency Protocols", venue: "Pasig Roadwise", date: "May 28, 2025", time: "10:00 AM" }
      ];

      const onChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
      };

      const onSubmit = (e) => {
        e.preventDefault();
        if (!form.title) return;
        if (!window.confirm("Add this schedule?")) return;
        setUpcoming((prev) => [
          ...prev,
          {
            title: form.title,
            venue: form.venue || "",
            date: form.date || "",
            time: form.time || ""
          }
        ]);
        setForm({ title: "", venue: "", date: "", time: "" });
        setAttendees([]);
        setAttendeeInput("");
        setShowAdd(false);
      };
      const onDelete = (index) => {
        if (!window.confirm("Delete this schedule?")) return;
        setUpcoming((prev) => prev.filter((_, i) => i !== index));
      };
      const onAttendeeKeyDown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const name = attendeeInput.trim();
          if (!name) return;
          setAttendees((prev) => [...prev, name]);
          setAttendeeInput("");
        }
      };
      const removeAttendee = (idx) => {
        setAttendees((prev) => prev.filter((_, i) => i !== idx));
      };
      const onAttendeeKeyDownEdit = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const name = attendeeInputEdit.trim();
          if (!name) return;
          setAttendeesEdit((prev) => [...prev, name]);
          setAttendeeInputEdit("");
        }
      };
      const removeAttendeeEdit = (idx) => {
        setAttendeesEdit((prev) => prev.filter((_, i) => i !== idx));
      };

      const openEditFromParticipants = () => {
        if (!selected) return;
        const index = upcoming.findIndex((u) =>
          u.title === selected.title && u.venue === selected.venue && u.date === selected.date && u.time === selected.time
        );
        setEditIndex(index);
        setEditForm({ title: selected.title, venue: selected.venue, date: selected.date, time: selected.time });
        setAttendeesEdit(sampleAttendees);
        setAttendeeInputEdit("");
        setShowParticipants(false);
        setShowEdit(true);
      };

      const onEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
      };

      const onSaveChanges = (e) => {
        e.preventDefault();
        if (!window.confirm("Save changes?")) return;
        setUpcoming((prev) => prev.map((item, i) => i === editIndex ? { ...item, ...editForm } : item));
        setShowEdit(false);
        setSelected(null);
      };
    return (
    <>
  

    <div className="max-w-7xl mx-auto px-4">
      <div className="bg-white border border-red-200 rounded-lg p-4 shadow">
        <div className="text-orange-400 text-xs font-semibold mb-3">Upcoming</div>
        <div className="overflow-x-auto overflow-y-auto h-47">
          <table className="min-w-full border text-sm table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center p-2 border w-2/5">Title</th>
                <th className="text-center p-2 border">Venue</th>
                <th className="text-center p-2 border">Date</th>
                <th className="text-center p-2 border">Time</th>
                <th className="text-center p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{row.title}</td>
                  <td className="p-2 border text-center">{row.venue}</td>
                  <td className="p-2 border text-center">{row.date}</td>
                  <td className="p-2 border text-center">{row.time}</td>
                  <td className="p-2 border text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setSelected(row); setShowParticipants(true); }} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Participants</button>
                      <button onClick={() => onDelete(idx)} className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-green-600 text-xs font-semibold my-3">Completed</div>
        <div className="overflow-x-auto overflow-y-auto h-47">
          <table className="min-w-full border text-sm table-fixed ">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-center p-2 border w-2/5">Title</th>
                <th className="text-center p-2 border">Venue</th>
                <th className="text-center p-2 border">Date</th>
                <th className="text-center p-2 border">Time</th>
                <th className="text-center p-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{row.title}</td>
                  <td className="p-2 border text-center">{row.venue}</td>
                  <td className="p-2 border text-center">{row.date}</td>
                  <td className="p-2 border text-center">{row.time}</td>
                  <td className="p-2 border text-center">
                    <button onClick={() => { setSelected(row); setShowCompletedParticipants(true); setCompletedEditMode(false); }} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded">Participants</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button onClick={() => setShowAdd(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded">+ Add</button>
        </div>
      </div>
    </div>

    {showAdd && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Add Training/Seminar Schedule</div>
          <form onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">Title:
                <input name="title" value={form.title} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Personal Development" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Date:
                  <input name="date" value={form.date} onChange={onChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="06-05-25" />
                </label>
                <label className="text-sm">Time:
                  <input name="time" value={form.time} onChange={onChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="10:00 AM" />
                </label>
              </div>
              <label className="text-sm">Venue:
                <input name="venue" value={form.venue} onChange={onChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Google Meet (Online)" />
              </label>
              <label className="text-sm">Description:
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows="3" placeholder="Gmeet link: https://..." />
              </label>
              <label className="text-sm">Attendees:
                <input
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={onAttendeeKeyDown}
                  className="mt-1 w-full border rounded px-2 py-1"
                  placeholder="Type a name and press enter"
                />
                <div className="mt-2 border rounded h-28 overflow-y-auto">
                  {attendees.map((name, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1 text-gray-700 border-b last:border-b-0 bg-gray-50">
                      <span className="truncate">{name}</span>
                      <button type="button" onClick={() => removeAttendee(i)} className="text-red-600 text-sm px-2">×</button>
                    </div>
                  ))}
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-red-600 text-white">Add</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {showCompletedParticipants && selected && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Participants</div>
          <div className="text-sm space-y-2">
            <div className="flex gap-2"><span className="font-semibold">Title:</span><span>{selected.title}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-2"><span className="font-semibold">Date:</span><span>{selected.date}</span></div>
              <div className="flex gap-2"><span className="font-semibold">Time:</span><span>{selected.time}</span></div>
            </div>
            <div className="font-semibold">Attendees:</div>
            <div className="text-gray-500 italic text-xs -mt-1">Check the box next to a participant's name if they attended the event.</div>
            <div className="mt-1 border rounded h-40 overflow-y-auto">
              {sampleAttendees.map((name, i) => (
                <label key={i} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                  <span className="truncate text-gray-700">{name}</span>
                  <input type="checkbox" className="h-4 w-4" disabled={!completedEditMode} />
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-5">
            <button onClick={() => setShowCompletedParticipants(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Cancel</button>
            <button onClick={() => setCompletedEditMode((prev) => !prev)} className="px-4 py-2 rounded bg-red-600 text-white">{completedEditMode ? "Save" : "Edit"}</button>
          </div>
        </div>
      </div>
    )}

    {showParticipants && selected && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Training/Seminar Schedule</div>
          <div className="text-sm space-y-2">
            <div className="flex gap-2"><span className="font-semibold">Title:</span><span>{selected.title}</span></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-2"><span className="font-semibold">Date:</span><span>{selected.date}</span></div>
              <div className="flex gap-2"><span className="font-semibold">Time:</span><span>{selected.time}</span></div>
            </div>
            <div className="flex gap-2"><span className="font-semibold">Venue:</span><span>{selected.venue}</span></div>
            <div>
              <div className="font-semibold">Description:</div>
              <div className="whitespace-pre-line text-gray-700">{sampleDescription}</div>
            </div>
            <div>
              <div className="font-semibold">Attendees:</div>
              <div className="mt-1 border rounded h-32 overflow-y-auto p-2 text-gray-700 space-y-1">
                {sampleAttendees.map((name, i) => (
                  <div key={i} className="border-b last:border-b-0 px-2 py-1">{name}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-5">
            <button onClick={() => setShowParticipants(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Back</button>
            <button onClick={openEditFromParticipants} className="px-4 py-2 rounded bg-red-600 text-white">Edit</button>
          </div>
        </div>
      </div>
    )}

    {showEdit && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
        <div className="bg-white rounded-md w-full max-w-xl p-5 shadow-lg">
          <div className="text-center font-semibold text-lg mb-4">Add Training/Seminar Schedule</div>
          <form onSubmit={onSaveChanges}>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">Title:
                <input name="title" value={editForm.title} onChange={onEditChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Personal Development" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">Date:
                  <input name="date" value={editForm.date} onChange={onEditChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="06-05-25" />
                </label>
                <label className="text-sm">Time:
                  <input name="time" value={editForm.time} onChange={onEditChange} type="text" className="mt-1 w-full border rounded px-2 py-1" placeholder="10:00 AM" />
                </label>
              </div>
              <label className="text-sm">Venue:
                <input name="venue" value={editForm.venue} onChange={onEditChange} className="mt-1 w-full border rounded px-2 py-1" placeholder="Google Meet (Online)" />
              </label>
              <label className="text-sm">Description:
                <textarea className="mt-1 w-full border rounded px-2 py-1" rows="3" placeholder="Gmeet link: https://..." defaultValue={sampleDescription} />
              </label>
              <label className="text-sm">Attendees:
                <input
                  value={attendeeInputEdit}
                  onChange={(e) => setAttendeeInputEdit(e.target.value)}
                  onKeyDown={onAttendeeKeyDownEdit}
                  className="mt-1 w-full border rounded px-2 py-1"
                  placeholder="Type a name and press enter"
                />
                <div className="mt-2 border rounded h-28 overflow-y-auto">
                  {attendeesEdit.map((name, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-1 text-gray-700 border-b last:border-b-0 bg-gray-50">
                      <span className="truncate">{name}</span>
                      <button type="button" onClick={() => removeAttendeeEdit(i)} className="text-red-600 text-sm px-2">×</button>
                    </div>
                  ))}
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 rounded bg-gray-500 text-white">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded bg-red-600 text-white">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    )}
         



</>);
} 
export default HrTrainings;