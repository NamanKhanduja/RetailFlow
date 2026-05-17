import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { Plus, Pencil, Trash2, X, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_EMP = { name:'', phone:'', role:'Staff', salary:'', joinDate:'' };
const ATT_STATUSES = ['Present','Absent','Half-Day','Leave'];
const ATT_CLR = { Present:'var(--emerald)', Absent:'var(--rose)', 'Half-Day':'var(--amber)', Leave:'var(--text-muted)' };

export default function Employees() {
  const [tab, setTab]       = useState('employees'); // 'employees' | 'attendance'
  const [employees, setEmp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(EMPTY_EMP);
  const [saving, setSaving] = useState(false);

  // Attendance state
  const today = new Date().toISOString().slice(0,10);
  const [attDate, setAttDate]     = useState(today);
  const [attendance, setAtt]      = useState({});  // { employeeId: status }
  const [attSaving, setAttSaving] = useState(false);

  const loadEmp = async () => {
    try {
      const { data } = await api.get('/employees');
      setEmp(data.data);
      // Init attendance map
      const map = {};
      data.data.forEach(e => { map[e._id] = ''; });
      setAtt(map);
    } catch (_) {}
    setLoading(false);
  };

  const loadAtt = async (date) => {
    try {
      const { data } = await api.get('/employees/attendance', { params:{ date } });
      const map = {};
      employees.forEach(e => { map[e._id] = ''; });
      data.data.forEach(r => { map[r.employee?._id || r.employee] = r.status; });
      setAtt(map);
    } catch (_) {}
  };

  useEffect(() => { loadEmp(); }, []);
  useEffect(() => { if (tab==='attendance' && employees.length) loadAtt(attDate); }, [tab, attDate, employees.length]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_EMP); setModal(true); };
  const openEdit   = (e) => { setEditing(e._id); setForm({...e, salary: e.salary, joinDate: e.joinDate?.slice(0,10)||''}); setModal(true); };

  const onChange = (e) => setForm(f => ({...f, [e.target.name]: e.target.value}));

  const onSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await api.put(`/employees/${editing}`, form); toast.success('Employee updated!'); }
      else         { await api.post('/employees', form);           toast.success('Employee added!'); }
      setModal(false); loadEmp();
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving.'); }
    finally { setSaving(false); }
  };

  const onDelete = async (id, name) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try { await api.delete(`/employees/${id}`); toast.success('Employee deactivated.'); loadEmp(); }
    catch (_) { toast.error('Could not deactivate.'); }
  };

  const saveAttendance = async () => {
    setAttSaving(true);
    try {
      const records = Object.entries(attendance)
        .filter(([,s]) => s !== '')
        .map(([emp, status]) => ({ employee: emp, date: attDate, status }));
      if (!records.length) { toast.error('Mark at least one status.'); setAttSaving(false); return; }
      await api.post('/employees/attendance', { records });
      toast.success('Attendance saved!');
    } catch (err) { toast.error(err.response?.data?.message || 'Error saving attendance.'); }
    finally { setAttSaving(false); }
  };

  return (
    <Layout title="Employees" subtitle="Manage staff and daily attendance"
      actions={tab==='employees'
        ? <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14}/> Add Employee</button>
        : <button className="btn btn-primary btn-sm" onClick={saveAttendance} disabled={attSaving}>
            {attSaving ? <span className="spinner"/> : '💾 Save Attendance'}
          </button>
      }>

      {/* Tab switcher */}
      <div style={{display:'flex',gap:8,marginBottom:24}}>
        {[['employees','👥 Directory'],['attendance','📅 Attendance']].map(([val,label]) => (
          <button key={val} className={`btn btn-sm ${tab===val?'btn-primary':'btn-ghost'}`}
            style={{width:'auto'}} onClick={()=>setTab(val)}>{label}</button>
        ))}
      </div>

      {/* ── Employees Tab ── */}
      {tab === 'employees' && (
        <div className="card">
          <div className="table-wrap">
            {loading ? <div className="empty-state"><div className="spinner"/></div>
            : employees.length === 0 ? <div className="empty-state"><Users size={40}/><p>No employees yet.</p></div>
            : (
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp._id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{
                            width:32,height:32,borderRadius:'50%',flexShrink:0,
                            background:'linear-gradient(135deg,var(--indigo),var(--purple))',
                            display:'flex',alignItems:'center',justifyContent:'center',
                            fontSize:12,fontWeight:700
                          }}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{fontWeight:600}}>{emp.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-indigo">{emp.role}</span></td>
                      <td style={{color:'var(--text-secondary)'}}>{emp.phone || '—'}</td>
                      <td style={{fontWeight:600}}>₹{emp.salary?.toLocaleString()}/mo</td>
                      <td style={{color:'var(--text-muted)',fontSize:12}}>{emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>openEdit(emp)}><Pencil size={13}/></button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={()=>onDelete(emp._id,emp.name)}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {tab === 'attendance' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <Calendar size={16} style={{color:'var(--text-muted)'}}/>
            <input type="date" className="form-input" style={{width:180}} value={attDate}
              onChange={e=>setAttDate(e.target.value)} max={today}/>
          </div>
          {employees.length === 0
            ? <div className="empty-state"><p>No employees found. Add employees first.</p></div>
            : (
              <div className="attendance-grid">
                {employees.map(emp => (
                  <div key={emp._id} className="attendance-row">
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{
                        width:38,height:38,borderRadius:'50%',
                        background:'linear-gradient(135deg,var(--indigo),var(--purple))',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontWeight:700,fontSize:14,flexShrink:0
                      }}>{emp.name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{fontWeight:600,fontSize:14}}>{emp.name}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{emp.role}</div>
                      </div>
                    </div>
                    <div className="att-toggle-group">
                      {ATT_STATUSES.map(s => {
                        const isActive = attendance[emp._id] === s;
                        return (
                          <button key={s} type="button"
                            onClick={() => setAtt(a => ({ ...a, [emp._id]: s }))}
                            style={{
                              padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
                              border:`1px solid ${isActive ? ATT_CLR[s] : 'rgba(255,255,255,0.1)'}`,
                              background: isActive ? `${ATT_CLR[s]}22` : 'transparent',
                              color: isActive ? ATT_CLR[s] : 'var(--text-muted)',
                              cursor:'pointer', transition:'all 0.15s',
                            }}>
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* Employee Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Edit Employee' : 'Add Employee'}</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={onSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label>Name *</label>
                    <input name="name" className="form-input" value={form.name} onChange={onChange} required/></div>
                  <div className="form-group"><label>Phone</label>
                    <input name="phone" className="form-input" value={form.phone} onChange={onChange}/></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label>Role</label>
                    <input name="role" className="form-input" value={form.role} onChange={onChange}/></div>
                  <div className="form-group"><label>Monthly Salary (₹)</label>
                    <input name="salary" type="number" min="0" className="form-input" value={form.salary} onChange={onChange}/></div>
                </div>
                <div className="form-group"><label>Join Date</label>
                  <input name="joinDate" type="date" className="form-input" value={form.joinDate} onChange={onChange}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{width:'auto'}} disabled={saving}>
                  {saving ? <span className="spinner"/> : (editing ? 'Update' : 'Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
