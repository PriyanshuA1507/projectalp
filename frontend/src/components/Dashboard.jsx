// import React, { useMemo, useEffect, useState, useRef } from 'react';
// import { Link } from 'react-router-dom';
// import { useSelector } from 'react-redux';
// import { 
//   FiUsers, FiBriefcase, FiPlusSquare, FiX, FiCheckCircle, 
//   FiActivity, FiBookOpen, FiFileText, FiAward, FiTrendingUp, 
//   FiClock, FiCalendar, FiCheck
// } from 'react-icons/fi';
// import { 
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
//   PieChart, Pie, Cell, Label, LabelList
// } from 'recharts';
// import { resources, resourceMap } from '../config/tableConfig';
// import { canAccessForm, canAccessTable } from '../config/rolePermissions.js';
// import { selectRole } from '../store/slices/authSlice.js';
// import { dashboardService } from '../services/dashboard.service';
// import TablePage from './TablePage';

// const StatCard = ({ icon, label, value, subtext, trend, trendUp, color, onClick, isActive, hideArrow }) => {
//   const colorClasses = {
//     blue: 'bg-blue-600 text-white',
//     green: 'bg-emerald-500 text-white',
//     purple: 'bg-purple-600 text-white',
//     orange: 'bg-orange-500 text-white',
//     teal: 'bg-teal-400 text-white',
//   };

//   return (
//     <div 
//       onClick={onClick}
//       className={
//         'p-5 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between transition-all duration-300 hover:shadow-md ' + 
//         (onClick ? 'cursor-pointer ' : '') + 
//         (isActive ? 'ring-2 ring-indigo-500 shadow-md scale-[1.02]' : '')
//       }
//     >
//       <div className="flex items-center space-x-3 mb-3">
//         <div className={'p-3 rounded-full ' + (colorClasses[color] || colorClasses.blue)}>
//           {React.cloneElement(icon, { size: 22 })}
//         </div>
//         <div>
//           <div className="text-sm text-gray-500 font-medium">{label}</div>
//           <div className="text-[28px] leading-none font-bold text-gray-800">{value}</div>
//         </div>
//       </div>
//       <div className="text-xs font-medium text-gray-500 flex items-center">
//         {trend && (
//           <span className={'mr-2 flex items-center ' + (trendUp ? 'text-emerald-500' : 'text-red-500')}>
//             {!hideArrow && (trendUp ? '↑' : '↓')} {trend}
//           </span>
//         )}
//         {subtext && <span>{subtext}</span>}
//       </div>
//     </div>
//   );
// };

// const WidgetBlock = ({ title, children, className = "" }) => (
//   <div className={'bg-white rounded-xl shadow-sm border border-gray-100 p-5 ' + className}>
//     <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
//     {children}
//   </div>
// );

// const QuickLink = ({ to, icon, label }) => (
//   <Link
//     to={to}
//     className="flex items-center p-3 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-100 shadow-sm"
//   >
//     <div className="p-2 mr-3 rounded-md bg-slate-100 text-slate-600">
//       {React.cloneElement(icon, { size: 18 })}
//     </div>
//     <span className="font-semibold text-sm text-gray-700">{label}</span>
//   </Link>
// );

// export default function Dashboard() {
//   const role = useSelector(selectRole);
//   const [activeTable, setActiveTable] = useState(null);
//   const tableRef = useRef(null);
  
//   const [selectedYear, setSelectedYear] = useState('All');
//   const [selectedDept, setSelectedDept] = useState('All');

//   const academicYears = ['All', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26', '2026-27'];
//   const departmentsList = ['All', 'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'AI/ML', 'BioTech'];

//   const [stats, setStats] = useState({ 
//     students: 0, 
//     faculty: 0, 
//     departments: 0,
//     researchPapers: 0,
//     booksChapters: 0,
//     patentsFiled: 0,
//     patentsGranted: 0,
//     aparSubmitted: 0
//   });

//   useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         const data = await dashboardService.getStats(selectedYear, selectedDept);
//         if (data) {
//           setStats({
//             students: data.students || 0,
//             faculty: data.faculty || 0,
//             departments: data.departments || 0,
//             researchPapers: data.researchPapers || 0,
//             booksChapters: data.booksChapters || 0,
//             patentsFiled: data.patentsFiled || 0,
//             patentsGranted: data.patentsGranted || 0,
//             aparSubmitted: data.aparSubmitted || 0
//           });
//         }
//       } catch (error) {
//         console.error("Failed to fetch dashboard stats", error);
//       }
//     };
//     if (role) fetchStats();
//   }, [role, selectedYear, selectedDept]);

//   const dynamicBarData = useMemo(() => {
//     const defaultData = [
//       { name: 'CSE', pass: 94 }, { name: 'IT', pass: 92 }, { name: 'ECE', pass: 88 },
//       { name: 'EE', pass: 85 }, { name: 'ME', pass: 82 }, { name: 'CE', pass: 89 },
//       { name: 'AI/ML', pass: 96 }, { name: 'Data Sci', pass: 95 }, { name: 'BioTech', pass: 91 }
//     ];
//     const yearFactor = selectedYear === 'All' ? 0 : parseInt(selectedYear.split('-')[1]) % 4;
//     return defaultData.map(item => {
//       let passRate = item.pass + (yearFactor - 2);
//       if (selectedDept !== 'All' && item.name === selectedDept) {
//         passRate = Math.min(passRate + 4, 100); 
//       }
//       return { ...item, pass: Math.min(Math.max(passRate, 60), 100) };
//     });
//   }, [selectedYear, selectedDept]);

//   const dynamicFeedbackData = useMemo(() => {
//     const cycle = selectedYear === 'All' ? 2 : parseInt(selectedYear.split('-')[1]) % 5;
//     const offset = (cycle - 2) * 0.08;
//     return [
//       { name: 'Teaching Learning', value: Math.min(4.35 + offset, 5), color: '#2563eb' },
//       { name: 'Curriculum', value: Math.min(4.10 + offset, 5), color: '#10b981' },
//       { name: 'Infrastructure', value: Math.min(4.05 - offset, 5), color: '#f59e0b' },
//       { name: 'Support Services', value: Math.min(4.15 + offset, 5), color: '#8b5cf6' }
//     ];
//   }, [selectedYear]);

//   const overallFeedbackScore = useMemo(() => {
//     const sum = dynamicFeedbackData.reduce((acc, curr) => acc + curr.value, 0);
//     return (sum / dynamicFeedbackData.length).toFixed(2);
//   }, [dynamicFeedbackData]);

//   const dynamicQualityData = useMemo(() => {
//     return [
//       { name: 'Research Papers', value: stats.researchPapers || 0, color: '#8b5cf6' },
//       { name: 'Books & Chapters', value: stats.booksChapters || 0, color: '#3b82f6' },
//       { name: 'Patents Filed', value: stats.patentsFiled || 0, color: '#f59e0b' }
//     ];
//   }, [stats]);

//   const qualityInitiativesTotal = useMemo(() => {
//     return stats.researchPapers + stats.booksChapters + stats.patentsFiled;
//   }, [stats]);

//   const dynamicInfraData = useMemo(() => {
//     let score = 4.28;
//     if (selectedDept === 'CSE') score = 4.75;
//     else if (selectedDept === 'IT') score = 4.62;
//     else if (selectedDept === 'AI/ML') score = 4.90;
//     else if (selectedDept !== 'All') score = 3.80;

//     return [
//       { name: 'Score', value: score, color: '#2dd4bf' },
//       { name: 'Remaining', value: parseFloat((5 - score).toFixed(2)), color: '#f1f5f9' }
//     ];
//   }, [selectedDept]);

//   const dynamicStudentProgression = useMemo(() => {
//     let basePlacement = 82.6;
//     if (selectedDept === 'CSE' || selectedDept === 'IT') basePlacement = 95.8;
//     else if (selectedDept === 'ECE') basePlacement = 88.4;
//     else if (selectedDept !== 'All') basePlacement = 74.2;

//     return [
//       { icon: <FiUsers/>, label: 'Placements', val: `${basePlacement}%` },
//       { icon: <FiBookOpen/>, label: 'Higher Studies', val: '14.3%' },
//       { icon: <FiActivity/>, label: 'Entrepreneurship', val: '3.1%' },
//       { icon: <FiAward/>, label: 'Competitive Exams', val: '6.8%' }
//     ];
//   }, [selectedDept]);

//   const quickActions = useMemo(() => {
//     if (!role) return [];
//     return resources.filter((resource) => Boolean(resource.addPath) && canAccessForm(role, resource.id));
//   }, [role]);

//   const handleCardClick = (tableId) => {
//     if (activeTable === tableId) {
//       setActiveTable(null);
//     } else {
//       const config = resourceMap.get(tableId);
//       if (config && canAccessTable(role, config.id || tableId)) {
//         setActiveTable(tableId);
//         setTimeout(() => {
//           tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
//         }, 100);
//       }
//     }
//   };

//   const activeConfig = activeTable ? resourceMap.get(activeTable) : null;

//   return (
//     <div className="pb-16 max-w-[1600px] mx-auto bg-[#fafafa] font-sans px-4">
      
//       {/* SELECTION MULTI-FILTER CONTROL BAR */}
//       <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-gray-100 shadow-sm gap-4 mt-4">
//         <div>
//           <h1 className="text-xl font-bold text-gray-800">IQAC Core Statistics</h1>
//           <p className="text-xs text-gray-500 mt-1">Real-time parameters filtering across department and timeline layers.</p>
//         </div>
        
//         <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
//           <div className="flex items-center gap-2 flex-1 sm:flex-initial">
//             <label className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 whitespace-nowrap">
//               <FiCalendar className="text-indigo-600" size={16} />
//               Session:
//             </label>
//             <select
//               value={selectedYear}
//               onChange={(e) => setSelectedYear(e.target.value)}
//               className="h-10 rounded-lg border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:border-indigo-500 focus:ring-indigo-500 px-3 shadow-inner min-w-[120px] cursor-pointer w-full md:w-auto border"
//             >
//               {academicYears.map(ay => (
//                 <option key={ay} value={ay}>{ay === 'All' ? 'All Years' : ay}</option>
//               ))}
//             </select>
//           </div>

//           <div className="flex items-center gap-2 flex-1 sm:flex-initial">
//             <label className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 whitespace-nowrap">
//               <FiBriefcase className="text-indigo-600" size={16} />
//               Branch:
//             </label>
//             <select
//               value={selectedDept}
//               onChange={(e) => setSelectedDept(e.target.value)}
//               className="h-10 rounded-lg border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:border-indigo-500 focus:ring-indigo-500 px-3 shadow-inner min-w-[160px] cursor-pointer w-full md:w-auto border"
//             >
//               {departmentsList.map(dept => (
//                 <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : `${dept} Branch`}</option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Top Row Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
//         <StatCard 
//           icon={<FiBookOpen />} label="Total Programs" value={stats.departments || 0} color="blue" 
//           subtext="Dynamic Track Feed" isActive={activeTable === 'departments'} 
//           onClick={() => handleCardClick('departments')}
//         />
//         <StatCard 
//           icon={<FiUsers />} label="Total Students" value={stats.students.toLocaleString()} color="green" 
//           trend={selectedYear === 'All' && selectedDept === 'All' ? "6.8%" : ""} trendUp={true} 
//           subtext={`Period: ${selectedYear} | Branch: ${selectedDept}`} isActive={activeTable === 'students'} 
//           onClick={() => handleCardClick('students')}
//         />
//         <StatCard 
//           icon={<FiBriefcase />} label="Total Faculty" value={stats.faculty.toLocaleString()} color="purple" 
//           trend={selectedYear === 'All' && selectedDept === 'All' ? "4.5%" : ""} trendUp={true} 
//           subtext={`Period: ${selectedYear} | Branch: ${selectedDept}`} isActive={activeTable === 'faculty'} 
//           onClick={() => handleCardClick('faculty')}
//         />
//         <StatCard 
//           icon={<FiFileText />} label="Quality Initiatives" value={qualityInitiativesTotal} color="orange" 
//           trend="Dynamic" trendUp={true} subtext="Sum of Papers/Books/Patents"
//         />
//         <StatCard 
//           icon={<FiCheckCircle />} label="Total APAR Submitted" value={stats.aparSubmitted.toLocaleString()} color="teal" 
//           trend="" hideArrow={true} subtext="System Logged"
//         />
//       </div>

//       {/* Interjected Active Table View Container */}
//       {activeTable && activeConfig && (
//         <div ref={tableRef} className="mb-6 bg-white rounded-xl shadow-xl overflow-hidden border border-indigo-100 transition-all duration-500 ease-in-out">
//           <div className="bg-indigo-50/50 px-6 py-3 border-b border-indigo-100 flex justify-between items-center">
//             <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
//               Showing detailed view for {activeConfig.id.charAt(0).toUpperCase() + activeConfig.id.slice(1)}
//             </h2>
//             <button 
//               onClick={() => setActiveTable(null)}
//               className="p-1.5 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-red-500 shadow-sm border border-transparent hover:border-gray-200"
//             >
//               <FiX size={20} />
//             </button>
//           </div>
//           <div className="p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
//             <TablePage key={activeTable} config={activeConfig} />
//           </div>
//         </div>
//       )}

//       {/* Middle Row Dynamic Charts */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
//         <WidgetBlock title={`Academic Performance (${selectedDept === 'All' ? 'All Branches' : `${selectedDept} Branch`})`}>
//           <div className="h-60 w-full relative -ml-4">
//              <div className="absolute left-4 top-0 text-[10px] text-gray-400 rotate-[-90deg] origin-left translate-y-24">Pass Percentage (%)</div>
//              <div className="absolute right-0 top-0 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 bg-white shadow-sm">{selectedYear === 'All' ? 'All Sessions' : selectedYear} ⌄</div>
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={dynamicBarData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }} barCategoryGap="30%">
//                 <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
//                 <XAxis dataKey="name" axisLine={{stroke: '#e2e8f0'}} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
//                 <YAxis axisLine={{stroke: '#e2e8f0'}} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
//                 <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
//                 <Bar dataKey="pass" fill="#3b82f6" radius={[2, 2, 0, 0]}>
//                   {dynamicBarData.map((entry, index) => (
//                     <Cell key={'cell-'+index} fill={entry.name === selectedDept ? '#6366f1' : '#4285F4'} />
//                   ))}
//                   <LabelList dataKey="pass" position="top" formatter={(val) => `${val}%`} style={{ fontSize: '10px', fill: '#4b5563', fontWeight: 600 }} />
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </WidgetBlock>

//         <WidgetBlock title={`Feedback Analysis (${selectedYear === 'All' ? 'Cumulative' : `Session ${selectedYear}`})`}>
//           <div className="h-60 flex items-center justify-between gap-4">
//             <div className="flex-1 h-full w-full">
//               <ResponsiveContainer width="100%" height="100%">
//                 <PieChart>
//                   <Pie data={dynamicFeedbackData} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
//                     {dynamicFeedbackData.map((entry, index) => (
//                       <Cell key={'cell-'+index} fill={entry.color} />
//                     ))}
//                     <Label 
//                       value={overallFeedbackScore} position="center" className="text-3xl font-bold fill-slate-800" dy={-5}
//                     />
//                     <Label 
//                       value="Out of 5" position="center" className="text-[10px] fill-slate-500 font-medium" dy={15}
//                     />
//                   </Pie>
//                   <RechartsTooltip />
//                 </PieChart>
//               </ResponsiveContainer>
//             </div>
//             <div className="flex flex-col gap-3 text-[11px] shrink-0 justify-center">
//               {dynamicFeedbackData.map(item => (
//                 <div key={item.name} className="flex items-center justify-between gap-3">
//                   <div className="flex items-center gap-2">
//                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
//                     <span className="text-slate-600 truncate w-24">{item.name}</span>
//                   </div>
//                   <span className="font-semibold text-slate-700">{item.value.toFixed(2)}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </WidgetBlock>

//         <WidgetBlock title="Quality Initiatives (Real-time DB Composition)">
//           <div className="h-60 flex items-center justify-center relative">
//             <ResponsiveContainer width="100%" height="100%">
//               <PieChart>
//                 <Pie data={dynamicQualityData} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
//                   {dynamicQualityData.map((entry, index) => (
//                     <Cell key={'cell-'+index} fill={entry.color} />
//                   ))}
//                   <Label 
//                     value={qualityInitiativesTotal.toString()} position="center" className="text-3xl font-bold fill-slate-800" dy={-5}
//                   />
//                   <Label 
//                     value="Total Entries" position="center" className="text-[10px] fill-slate-500 font-medium" dy={15}
//                   />
//                 </Pie>
//                 <RechartsTooltip />
//               </PieChart>
//             </ResponsiveContainer>
//             <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 text-[11px]">
//               {dynamicQualityData.map(item => (
//                 <div key={item.name} className="flex flex-col">
//                   <div className="flex items-center gap-2 mb-0.5">
//                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
//                     <span className="text-slate-600">{item.name}</span>
//                   </div>
//                   <span className="font-semibold text-slate-800 ml-4">
//                     {item.value} ({qualityInitiativesTotal > 0 ? Math.round(item.value / qualityInitiativesTotal * 100) : 0}%)
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </WidgetBlock>
//       </div>

//       {/* Bottom Row Widgets */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 items-stretch">
//         <WidgetBlock title="Research & Innovation" className="flex flex-col">
//           <div className="grid grid-cols-2 gap-3 flex-grow">
//             <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
//               <div className="p-2 bg-purple-100 text-purple-600 rounded-md mb-2"><FiFileText size={16}/></div>
//               <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Research Papers<br/>Published</div>
//               <div className="text-lg font-bold text-gray-800">{stats.researchPapers}</div>
//               <div className="text-[10px] text-indigo-500 font-medium mt-1">Live DB Feed</div>
//             </div>
//             <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
//               <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md mb-2"><FiBookOpen size={16}/></div>
//               <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Books/Chapters<br/>Published</div>
//               <div className="text-lg font-bold text-gray-800">{stats.booksChapters}</div>
//               <div className="text-[10px] text-emerald-500 font-medium mt-1">Live DB Feed</div>
//             </div>
//             <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
//               <div className="p-2 bg-orange-100 text-orange-600 rounded-md mb-2"><FiAward size={16}/></div>
//               <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Patents<br/>Filed</div>
//               <div className="text-lg font-bold text-gray-800">{stats.patentsFiled}</div>
//               <div className="text-[10px] text-orange-500 font-medium mt-1">Live DB Feed</div>
//             </div>
//             <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
//               <div className="p-2 bg-amber-100 text-amber-600 rounded-md mb-2"><FiCheckCircle size={16}/></div>
//               <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Patents<br/>Granted</div>
//               <div className="text-lg font-bold text-gray-800">{stats.patentsGranted}</div>
//               <div className="text-[10px] text-emerald-500 font-medium mt-1">Live DB Feed</div>
//             </div>
//             <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm col-span-2 bg-white">
//               <div className="p-2 bg-blue-100 text-blue-600 rounded-md mb-2"><FiTrendingUp size={16}/></div>
//               <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Research Grants<br/>(Min.)</div>
//               <div className="text-lg font-bold text-gray-800">₹ 5.6 Cr</div>
//               <div className="text-[10px] text-emerald-500 font-medium mt-1">↑ 18%</div>
//             </div>
//           </div>
//         </WidgetBlock>

//         <WidgetBlock title="Student Support & Progression" className="flex flex-col">
//           <div className="flex flex-col justify-between flex-grow space-y-3 px-2 py-1">
//             {dynamicStudentProgression.map(item => (
//               <div key={item.label} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
//                 <div className="flex items-center gap-3">
//                   <div className={'p-1.5 rounded bg-slate-100 text-slate-600'}>
//                     {React.cloneElement(item.icon, { size: 12 })}
//                   </div>
//                   <span className="text-xs font-medium text-slate-600">{item.label}</span>
//                 </div>
//                 <span className="font-semibold text-slate-800 text-sm">{item.val}</span>
//               </div>
//             ))}
//           </div>
//         </WidgetBlock>

//         <WidgetBlock title="Infrastructure Adequacy" className="flex flex-col">
//           <div className="flex flex-col items-center justify-center flex-grow w-full pt-4">
//             <div className="w-full h-[140px] relative mt-2 flex justify-center">
//               <ResponsiveContainer width="100%" height="100%">
//                 <PieChart>
//                   <Pie 
//                     data={dynamicInfraData} cx="50%" cy="100%" startAngle={180} endAngle={0} 
//                     innerRadius={75} outerRadius={105} paddingAngle={0} dataKey="value" stroke="none"
//                   >
//                     {dynamicInfraData.map((entry, index) => (
//                       <Cell key={'cell-'+index} fill={entry.color} />
//                     ))}
//                   </Pie>
//                 </PieChart>
//               </ResponsiveContainer>
              
//               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-slate-800 rounded-full z-20"></div>
//               <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-[90px] bg-slate-800 rounded-t-full z-10 origin-bottom" style={{transform: `rotate(${(dynamicInfraData[0].value - 1) * 45}deg)`}}></div>

//               <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
//                 <span className="text-3xl font-extrabold text-slate-800 bg-white/70 px-2 rounded-md">{dynamicInfraData[0].value}</span>
//                 <span className="text-xs text-slate-500 font-semibold absolute -bottom-5">Out of 5</span>
//               </div>
              
//               <div className="absolute bottom-0 left-[15%] text-sm font-bold text-slate-600">1</div>
//               <div className="absolute bottom-0 right-[15%] text-sm font-bold text-slate-600">5</div>
//             </div>
//           </div>
//         </WidgetBlock>
//       </div>

//       {/* Lowest Row Info panels */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
//         <WidgetBlock title="APAR Progress" className="lg:col-span-2">
//           <div className="flex items-start justify-between px-2 sm:px-6 h-[120px] relative py-6">
//             <div className="absolute top-[34px] left-[10%] right-[10%] h-1 bg-gray-200 z-0"></div>
//             <div className="absolute top-[34px] left-[10%] w-[60%] h-1 bg-emerald-500 z-0"></div>

//             {[
//               { label: 'Data Collection', status: 'Completed', icon: <FiCheck/>, color: 'bg-emerald-500 text-white border-2 border-emerald-500', textCol: 'text-emerald-500' },
//               { label: 'Data Validation', status: 'Completed', icon: <FiCheck/>, color: 'bg-emerald-500 text-white border-2 border-emerald-500', textCol: 'text-emerald-500' },
//               { label: 'Report Drafting', status: 'Completed', icon: <FiCheck/>, color: 'bg-emerald-500 text-white border-2 border-emerald-500', textCol: 'text-emerald-500' },
//               { label: 'Final Review', status: 'In Progress', icon: <span className="font-bold text-sm">4</span>, color: 'bg-blue-500 text-white shadow-[0_0_0_3px_#bfdbfe]', textCol: 'text-blue-500' },
//               { label: 'Submitted', status: 'Pending', icon: <FiFileText/>, color: 'bg-slate-200 text-slate-400 border-2 border-slate-200', textCol: 'text-slate-400' }
//             ].map((step, i) => (
//               <div key={i} className="flex flex-col items-center z-10 w-24">
//                 <div className={'w-6 h-6 rounded-full flex items-center justify-center mb-2 ' + step.color}>
//                   {React.cloneElement(step.icon, { size: 12 })}
//                 </div>
//                 <div className="text-[11px] font-semibold text-slate-700 text-center leading-tight mb-1">{step.label}</div>
//                 <div className={'text-[10px] bg-white ' + step.textCol}>{step.status}</div>
//               </div>
//             ))}
//           </div>
//         </WidgetBlock>

//         <WidgetBlock title="Recent Activities">
//           <div className="flex flex-col justify-center space-y-4 h-[120px] pt-1">
//             {[
//               { title: 'Workshop on NAAC Assessment & Accreditation', date: '20 Jan 2026', icon: <FiActivity/>, color: 'bg-purple-100 text-purple-600' },
//               { title: 'Student Satisfaction Survey Completed', date: '15 Jan 2026', icon: <FiCheckCircle/>, color: 'bg-emerald-100 text-emerald-600' },
//               { title: 'IQAC Meeting Held', date: '10 Jan 2026', icon: <FiCalendar/>, color: 'bg-orange-100 text-orange-600' },
//               { title: 'Best Practice Documented', date: '05 Jan 2026', icon: <FiBookOpen/>, color: 'bg-blue-100 text-blue-600' }
//             ].map((act, i) => (
//                <div key={i} className="flex items-center gap-3">
//                  <div className={'p-1.5 rounded text-xs ' + act.color}>
//                    {React.cloneElement(act.icon, { size: 12 })}
//                  </div>
//                  <div className="flex-1 min-w-0">
//                    <h4 className="text-[11px] font-medium text-slate-700 truncate" title={act.title}>{act.title}</h4>
//                  </div>
//                  <div className="text-[10px] text-slate-400 whitespace-nowrap">{act.date}</div>
//                </div>
//             ))}
//           </div>
//         </WidgetBlock>
//       </div>

//       <div className="mt-8 mb-4 flex items-center justify-between">
//          <h2 className="text-base font-semibold text-gray-800">Quick Form Actions</h2>
//       </div>
//       {quickActions.length > 0 ? (
//         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
//           {quickActions.map((resource) => (
//             <QuickLink
//               key={resource.id}
//               to={resource.addPath}
//               icon={<resource.icon />}
//               label={resource.addLabel}
//             />
//           ))}
//         </div>
//       ) : (
//         <div className="rounded border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
//           No quick actions available.
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiUsers, FiBriefcase, FiPlusSquare, FiX, FiCheckCircle, 
  FiActivity, FiBookOpen, FiFileText, FiAward, FiTrendingUp, 
  FiClock, FiCalendar, FiCheck
} from 'react-icons/fi';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Label, LabelList
} from 'recharts';
import { resources, resourceMap } from '../config/tableConfig';
import { canAccessForm, canAccessTable } from '../config/rolePermissions.js';
import { selectRole } from '../store/slices/authSlice.js';
import { dashboardService } from '../services/dashboard.service';
import TablePage from './TablePage';

const StatCard = ({ icon, label, value, subtext, trend, trendUp, color, onClick, isActive, hideArrow }) => {
  const colorClasses = {
    blue: 'bg-blue-600 text-white',
    green: 'bg-emerald-500 text-white',
    purple: 'bg-purple-600 text-white',
    orange: 'bg-orange-500 text-white',
    teal: 'bg-teal-400 text-white',
  };

  return (
    <div 
      onClick={onClick}
      className={
        'p-5 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between transition-all duration-300 hover:shadow-md ' + 
        (onClick ? 'cursor-pointer ' : '') + 
        (isActive ? 'ring-2 ring-indigo-500 shadow-md scale-[1.02]' : '')
      }
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className={'p-3 rounded-full ' + (colorClasses[color] || colorClasses.blue)}>
          {React.cloneElement(icon, { size: 22 })}
        </div>
        <div>
          <div className="text-sm text-gray-500 font-medium">{label}</div>
          <div className="text-[28px] leading-none font-bold text-gray-800">{value}</div>
        </div>
      </div>
      <div className="text-xs font-medium text-gray-500 flex items-center">
        {trend && (
          <span className={'mr-2 flex items-center ' + (trendUp ? 'text-emerald-500' : 'text-red-500')}>
            {!hideArrow && (trendUp ? '↑' : '↓')} {trend}
          </span>
        )}
        {subtext && <span>{subtext}</span>}
      </div>
    </div>
  );
};

const WidgetBlock = ({ title, children, className = "" }) => (
  <div className={'bg-white rounded-xl shadow-sm border border-gray-100 p-5 ' + className}>
    <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
    {children}
  </div>
);

const QuickLink = ({ to, icon, label }) => (
  <Link
    to={to}
    className="flex items-center p-3 bg-white rounded-lg hover:bg-indigo-50 transition-colors border border-gray-100 shadow-sm"
  >
    <div className="p-2 mr-3 rounded-md bg-slate-100 text-slate-600">
      {React.cloneElement(icon, { size: 18 })}
    </div>
    <span className="font-semibold text-sm text-gray-700">{label}</span>
  </Link>
);

export default function Dashboard() {
  const role = useSelector(selectRole);
  const [activeTable, setActiveTable] = useState(null);
  const tableRef = useRef(null);
  
  // ACTIVE FILTER SELECTION STATES
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');

  const academicYears = ['All', '2020-21', '2021-22', '2022-23', '2023-24', '2024-25', '2025-26', '2026-27'];
  const departmentsList = ['All', 'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE', 'AI/ML', 'BioTech'];

  // 🚀 ALL STATS FORCED TO INITIALIZE STRICTLY AT 0
  const [stats, setStats] = useState({ 
    students: 0, 
    faculty: 0, 
    departments: 0,
    researchPapers: 0,
    booksChapters: 0,
    patentsFiled: 0,
    patentsGranted: 0,
    aparSubmitted: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      console.log(`📡 Dashboard Query Fired -> Year: ${selectedYear} | Branch: ${selectedDept}`);
      try {
        const data = await dashboardService.getStats(selectedYear, selectedDept);
        console.log("📥 Live API Query Response Data:", data);
        if (data) {
          // 🚀 MAP DATA DIRECTLY TO STATE WITH EXPLICIT ZERO FALLBACKS
          setStats({
            students: data.students || 0,
            faculty: data.faculty || 0,
            departments: data.departments || 0,
            researchPapers: data.researchPapers || 0,
            booksChapters: data.booksChapters || 0,
            patentsFiled: data.patentsFiled || 0,
            patentsGranted: data.patentsGranted || 0,
            aparSubmitted: data.aparSubmitted || 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch real-time stats", error);
      }
    };
    if (role) fetchStats();
  }, [role, selectedYear, selectedDept]);

  // 🚀 CHARTS REMOVED OF FICTIONAL PLUG NUMBERS - DEFAULT TO 0 INSTEAD
  const dynamicBarData = useMemo(() => {
    return [
      { name: 'CSE', pass: 0 }, { name: 'IT', pass: 0 }, { name: 'ECE', pass: 0 },
      { name: 'EE', pass: 0 }, { name: 'ME', pass: 0 }, { name: 'CE', pass: 0 },
      { name: 'AI/ML', pass: 0 }, { name: 'Data Sci', pass: 0 }, { name: 'BioTech', pass: 0 }
    ];
  }, []);

  const dynamicFeedbackData = useMemo(() => {
    return [
      { name: 'Teaching Learning', value: 0, color: '#2563eb' },
      { name: 'Curriculum', value: 0, color: '#10b981' },
      { name: 'Infrastructure', value: 0, color: '#f59e0b' },
      { name: 'Support Services', value: 0, color: '#8b5cf6' }
    ];
  }, []);

  const overallFeedbackScore = useMemo(() => {
    const sum = dynamicFeedbackData.reduce((acc, curr) => acc + curr.value, 0);
    return sum > 0 ? (sum / dynamicFeedbackData.length).toFixed(2) : "0.00";
  }, [dynamicFeedbackData]);

  // 🚀 QUALITY COMPOSITION TIED EXCLUSIVELY TO REAL LIVE DATABASE VALUE METRICS
  const dynamicQualityData = useMemo(() => {
    return [
      { name: 'Research Papers', value: stats.researchPapers, color: '#8b5cf6' },
      { name: 'Books & Chapters', value: stats.booksChapters, color: '#3b82f6' },
      { name: 'Patents Filed', value: stats.patentsFiled, color: '#f59e0b' }
    ];
  }, [stats]);

  const qualityInitiativesTotal = useMemo(() => {
    return stats.researchPapers + stats.booksChapters + stats.patentsFiled;
  }, [stats]);

  const dynamicInfraData = useMemo(() => {
    return [
      { name: 'Score', value: 0, color: '#2dd4bf' },
      { name: 'Remaining', value: 5, color: '#f1f5f9' }
    ];
  }, []);

  const dynamicStudentProgression = useMemo(() => {
    return [
      { icon: <FiUsers/>, label: 'Placements', val: '0%' },
      { icon: <FiBookOpen/>, label: 'Higher Studies', val: '0%' },
      { icon: <FiActivity/>, label: 'Entrepreneurship', val: '0%' },
      { icon: <FiAward/>, label: 'Competitive Exams', val: '0%' }
    ];
  }, []);

  const quickActions = useMemo(() => {
    if (!role) return [];
    return resources.filter((resource) => Boolean(resource.addPath) && canAccessForm(role, resource.id));
  }, [role]);

  const handleCardClick = (tableId) => {
    if (activeTable === tableId) {
      setActiveTable(null);
    } else {
      const config = resourceMap.get(tableId);
      if (config && canAccessTable(role, config.id || tableId)) {
        setActiveTable(tableId);
        setTimeout(() => {
          tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  };

  const activeConfig = activeTable ? resourceMap.get(activeTable) : null;

  return (
    <div className="pb-16 max-w-[1600px] mx-auto bg-[#fafafa] font-sans px-4">
      
      {/* SELECTION MULTI-FILTER CONTROL BAR */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-gray-100 shadow-sm gap-4 mt-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">IQAC Core Statistics</h1>
          <p className="text-xs text-gray-500 mt-1">Real-time parameters filtering across department and timeline layers.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Academic Session Options */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <label className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 whitespace-nowrap">
              <FiCalendar className="text-indigo-600" size={16} />
              Session:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-10 rounded-lg border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:border-indigo-500 focus:ring-indigo-500 px-3 shadow-inner min-w-[120px] cursor-pointer w-full md:w-auto border"
            >
              {academicYears.map(ay => (
                <option key={ay} value={ay}>{ay === 'All' ? 'All Years' : ay}</option>
              ))}
            </select>
          </div>

          {/* Department Branch Selection */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <label className="text-sm font-semibold text-gray-600 flex items-center gap-1.5 whitespace-nowrap">
              <FiBriefcase className="text-indigo-600" size={16} />
              Branch:
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-10 rounded-lg border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 focus:border-indigo-500 focus:ring-indigo-500 px-3 shadow-inner min-w-[160px] cursor-pointer w-full md:w-auto border"
            >
              {departmentsList.map(dept => (
                <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : `${dept} Branch`}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Top Row Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <StatCard 
          icon={<FiBookOpen />} label="Total Programs" value={stats.departments.toLocaleString()} color="blue" 
          subtext="Dynamic Track Feed" isActive={activeTable === 'departments'} 
          onClick={() => handleCardClick('departments')}
        />
        <StatCard 
          icon={<FiUsers />} label="Total Students" value={stats.students.toLocaleString()} color="green" 
          trend="" hideArrow={true}
          subtext={`Period: ${selectedYear} | Branch: ${selectedDept}`} isActive={activeTable === 'students'} 
          onClick={() => handleCardClick('students')}
        />
        <StatCard 
          icon={<FiBriefcase />} label="Total Faculty" value={stats.faculty.toLocaleString()} color="purple" 
          trend="" hideArrow={true}
          subtext={`Period: ${selectedYear} | Branch: ${selectedDept}`} isActive={activeTable === 'faculty'} 
          onClick={() => handleCardClick('faculty')}
        />
        <StatCard 
          icon={<FiFileText />} label="Quality Initiatives" value={qualityInitiativesTotal.toLocaleString()} color="orange" 
          trend="" hideArrow={true} subtext="Sum of Papers/Books/Patents"
        />
        <StatCard 
          icon={<FiCheckCircle />} label="Total APAR Submitted" value={stats.aparSubmitted.toLocaleString()} color="teal" 
          trend="" hideArrow={true} subtext="System Logged"
        />
      </div>

      {/* Interjected Active Table View Container */}
      {activeTable && activeConfig && (
        <div ref={tableRef} className="mb-6 bg-white rounded-xl shadow-xl overflow-hidden border border-indigo-100 transition-all duration-500 ease-in-out">
          <div className="bg-indigo-50/50 px-6 py-3 border-b border-indigo-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Showing detailed view for {activeConfig.id.charAt(0).toUpperCase() + activeConfig.id.slice(1)}
            </h2>
            <button 
              onClick={() => setActiveTable(null)}
              className="p-1.5 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-red-500 shadow-sm border border-transparent hover:border-gray-200"
            >
              <FiX size={20} />
            </button>
          </div>
          <div className="p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
            <TablePage key={activeTable} config={activeConfig} />
          </div>
        </div>
      )}

      {/* Middle Row Dynamic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Dynamic Bar Chart */}
        <WidgetBlock title={`Academic Performance (${selectedDept === 'All' ? 'All Branches' : `${selectedDept} Branch`})`}>
          <div className="h-60 w-full relative -ml-4">
             <div className="absolute left-4 top-0 text-[10px] text-gray-400 rotate-[-90deg] origin-left translate-y-24">Pass Percentage (%)</div>
             <div className="absolute right-0 top-0 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 bg-white shadow-sm">{selectedYear === 'All' ? 'All Sessions' : selectedYear} ⌄</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dynamicBarData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={{stroke: '#e2e8f0'}} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={{stroke: '#e2e8f0'}} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="pass" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                  {dynamicBarData.map((entry, index) => (
                    <Cell key={'cell-'+index} fill={entry.name === selectedDept ? '#6366f1' : '#4285F4'} />
                  ))}
                  <LabelList dataKey="pass" position="top" formatter={(val) => `${val}%`} style={{ fontSize: '10px', fill: '#4b5563', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetBlock>

        {/* Dynamic Feedback Donut Chart */}
        <WidgetBlock title={`Feedback Analysis (${selectedYear === 'All' ? 'Cumulative' : `Session ${selectedYear}`})`}>
          <div className="h-60 flex items-center justify-between gap-4">
            <div className="flex-1 h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dynamicFeedbackData} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                    {dynamicFeedbackData.map((entry, index) => (
                      <Cell key={'cell-'+index} fill={entry.color} />
                    ))}
                    <Label 
                      value={overallFeedbackScore} position="center" className="text-3xl font-bold fill-slate-800" dy={-5}
                    />
                    <Label 
                      value="Out of 5" position="center" className="text-[10px] fill-slate-500 font-medium" dy={15}
                    />
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 text-[11px] shrink-0 justify-center">
              {dynamicFeedbackData.map(item => (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600 truncate w-24">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-700">{item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </WidgetBlock>

        {/* Live Quality Initiatives Pie Chart Composition */}
        <WidgetBlock title="Quality Initiatives (Real-time DB Composition)">
          <div className="h-60 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dynamicQualityData} innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                  {dynamicQualityData.map((entry, index) => (
                    <Cell key={'cell-'+index} fill={entry.color} />
                  ))}
                  <Label 
                    value={qualityInitiativesTotal.toString()} position="center" className="text-3xl font-bold fill-slate-800" dy={-5}
                  />
                  <Label 
                    value="Total Entries" position="center" className="text-[10px] fill-slate-500 font-medium" dy={15}
                  />
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 text-[11px]">
              {dynamicQualityData.map(item => (
                <div key={item.name} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800 ml-4">
                    {item.value} ({qualityInitiativesTotal > 0 ? Math.round(item.value / qualityInitiativesTotal * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </WidgetBlock>
      </div>

      {/* Bottom Row Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5 items-stretch">
        {/* Dynamic Research & Innovation Panel */}
        <WidgetBlock title="Research & Innovation" className="flex flex-col">
          <div className="grid grid-cols-2 gap-3 flex-grow">
            <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-md mb-2"><FiFileText size={16}/></div>
              <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Research Papers<br/>Published</div>
              <div className="text-lg font-bold text-gray-800">{stats.researchPapers}</div>
              <div className="text-[10px] text-indigo-500 font-medium mt-1">Live DB Feed</div>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-md mb-2"><FiBookOpen size={16}/></div>
              <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Books/Chapters<br/>Published</div>
              <div className="text-lg font-bold text-gray-800">{stats.booksChapters}</div>
              <div className="text-[10px] text-emerald-500 font-medium mt-1">Live DB Feed</div>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-md mb-2"><FiAward size={16}/></div>
              <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Patents<br/>Filed</div>
              <div className="text-lg font-bold text-gray-800">{stats.patentsFiled}</div>
              <div className="text-[10px] text-orange-500 font-medium mt-1">Live DB Feed</div>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm bg-white">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-md mb-2"><FiCheckCircle size={16}/></div>
              <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Patents<br/>Granted</div>
              <div className="text-lg font-bold text-gray-800">{stats.patentsGranted}</div>
              <div className="text-[10px] text-emerald-500 font-medium mt-1">Live DB Feed</div>
            </div>
            <div className="flex flex-col items-center justify-center p-2 border border-blue-50 rounded-lg text-center shadow-sm col-span-2 bg-white">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-md mb-2"><FiTrendingUp size={16}/></div>
              <div className="text-[10px] text-gray-500 mb-0.5 font-medium">Research Grants</div>
              <div className="text-lg font-bold text-gray-800">₹ 0</div>
              <div className="text-[10px] text-gray-400 font-medium mt-1">Live DB Feed</div>
            </div>
          </div>
        </WidgetBlock>

        {/* Dynamic Progression Support */}
        <WidgetBlock title="Student Support & Progression" className="flex flex-col">
          <div className="flex flex-col justify-between flex-grow space-y-3 px-2 py-1">
            {dynamicStudentProgression.map(item => (
              <div key={item.label} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={'p-1.5 rounded bg-slate-100 text-slate-600'}>
                    {React.cloneElement(item.icon, { size: 12 })}
                  </div>
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                </div>
                <span className="font-semibold text-slate-800 text-sm">{item.val}</span>
              </div>
            ))}
          </div>
        </WidgetBlock>

        {/* Dynamic Gauge Component Area */}
        <WidgetBlock title="Infrastructure Adequacy" className="flex flex-col">
          <div className="flex flex-col items-center justify-center flex-grow w-full pt-4">
            <div className="w-full h-[140px] relative mt-2 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={dynamicInfraData} cx="50%" cy="100%" startAngle={180} endAngle={0} 
                    innerRadius={75} outerRadius={105} paddingAngle={0} dataKey="value" stroke="none"
                  >
                    {dynamicInfraData.map((entry, index) => (
                      <Cell key={'cell-'+index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-slate-800 rounded-full z-20"></div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-[90px] bg-slate-800 rounded-t-full z-10 origin-bottom" style={{transform: `rotate(${(dynamicInfraData[0].value - 1) * 45}deg)`}}></div>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-800 bg-white/70 px-2 rounded-md">{dynamicInfraData[0].value}</span>
                <span className="text-xs text-slate-500 font-semibold absolute -bottom-5">Out of 5</span>
              </div>
              
              <div className="absolute bottom-0 left-[15%] text-sm font-bold text-slate-600">1</div>
              <div className="absolute bottom-0 right-[15%] text-sm font-bold text-slate-600">5</div>
            </div>
          </div>
        </WidgetBlock>
      </div>

      {/* Lowest Row Info panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <WidgetBlock title="APAR Progress" className="lg:col-span-2">
          <div className="flex items-start justify-between px-2 sm:px-6 h-[120px] relative py-6">
            <div className="absolute top-[34px] left-[10%] right-[10%] h-1 bg-gray-200 z-0"></div>
            <div className="absolute top-[34px] left-[10%] w-[60%] h-1 bg-gray-200 z-0"></div>

            {[
              { label: 'Data Collection', status: 'Pending', icon: <FiFileText/>, color: 'bg-slate-200 text-slate-400 border-2 border-slate-200', textCol: 'text-slate-400' },
              { label: 'Data Validation', status: 'Pending', icon: <FiFileText/>, color: 'bg-slate-200 text-slate-400 border-2 border-slate-200', textCol: 'text-slate-400' },
              { label: 'Report Drafting', status: 'Pending', icon: <FiFileText/>, color: 'bg-slate-200 text-slate-400 border-2 border-slate-200', textCol: 'text-slate-400' },
              { label: 'Final Review', status: 'Pending', icon: <FiFileText/>, color: 'bg-slate-200 text-slate-400 border-2 border-slate-200', textCol: 'text-slate-400' },
              { label: 'Submitted', status: 'Pending', icon: <FiFileText/>, color: 'bg-slate-200 text-slate-400 border-2 border-slate-200', textCol: 'text-slate-400' }
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center z-10 w-24">
                <div className={'w-6 h-6 rounded-full flex items-center justify-center mb-2 ' + step.color}>
                  {React.cloneElement(step.icon, { size: 12 })}
                </div>
                <div className="text-[11px] font-semibold text-slate-700 text-center leading-tight mb-1">{step.label}</div>
                <div className={'text-[10px] bg-white ' + step.textCol}>{step.status}</div>
              </div>
            ))}
          </div>
        </WidgetBlock>

        <WidgetBlock title="Recent Activities">
          <div className="flex flex-col justify-center space-y-4 h-[120px] pt-1 text-center text-xs text-gray-400">
             No recent session activities registered.
          </div>
        </WidgetBlock>
      </div>

      {/* Quick Shortcuts */}
      <div className="mt-8 mb-4 flex items-center justify-between">
         <h2 className="text-base font-semibold text-gray-800">Quick Form Actions</h2>
      </div>
      {quickActions.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {quickActions.map((resource) => (
            <QuickLink
              key={resource.id}
              to={resource.addPath}
              icon={<resource.icon />}
              label={resource.addLabel}
            />
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No quick actions available.
        </div>
      )}
    </div>
  );
}