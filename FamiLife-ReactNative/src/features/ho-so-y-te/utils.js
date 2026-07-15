/**
 * Helper utilities for FamiLife Ho So Y Te calculations
 */

export function getProfileName(profileId, familyProfiles = []) {
  const defaultId = profileId || 'p-self';
  if (defaultId === 'p-self') return 'Bản thân';
  const profile = (familyProfiles || []).find(p => p.id === defaultId);
  return profile ? profile.name : 'Thành viên khác';
}

export function getLatestBloodPressure(bpRecords = [], profileId = 'all') {
  const activeRecords = bpRecords.filter(r => !r.deleted_at);
  const filtered = profileId === 'all' 
    ? activeRecords 
    : activeRecords.filter(r => r.profile_id === profileId);

  if (filtered.length === 0) return null;

  // Sort by date/created_at descending
  filtered.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  return filtered[0];
}

export function getLatestBodyComp(bodyCompRecords = [], profileId = 'all') {
  const activeRecords = bodyCompRecords.filter(r => !r.deleted_at);
  const filtered = profileId === 'all' 
    ? activeRecords 
    : activeRecords.filter(r => r.profile_id === profileId);

  if (filtered.length === 0) return null;

  filtered.sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  return filtered[0];
}

export function calculateAverageBP(bpRecords = [], profileId = 'all') {
  const activeRecords = bpRecords.filter(r => !r.deleted_at);
  const filtered = profileId === 'all' 
    ? activeRecords 
    : activeRecords.filter(r => r.profile_id === profileId);

  if (filtered.length === 0) return { sys: 0, dia: 0, pulse: 0, count: 0 };

  const sumSys = filtered.reduce((sum, r) => sum + Number(r.sys || 0), 0);
  const sumDia = filtered.reduce((sum, r) => sum + Number(r.dia || 0), 0);
  const sumPulse = filtered.reduce((sum, r) => sum + Number(r.pulse || 0), 0);

  return {
    sys: Math.round(sumSys / filtered.length),
    dia: Math.round(sumDia / filtered.length),
    pulse: Math.round(sumPulse / filtered.length),
    count: filtered.length
  };
}

export function getBPCategory(sys, dia) {
  if (!sys || !dia) return { label: 'Chưa có số liệu', color: '#64748b' };
  
  if (sys < 120 && dia < 80) {
    return { label: 'Huyết áp bình thường', color: '#10b981' }; // Emerald
  }
  if ((sys >= 120 && sys <= 129) && dia < 80) {
    return { label: 'Huyết áp tiền cao', color: '#f59e0b' }; // Amber
  }
  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
    return { label: 'Cao huyết áp độ 1', color: '#f97316' }; // Orange
  }
  if (sys >= 140 || dia >= 90) {
    return { label: 'Cao huyết áp độ 2', color: '#ef4444' }; // Red
  }
  return { label: 'Không xác định', color: '#64748b' };
}
