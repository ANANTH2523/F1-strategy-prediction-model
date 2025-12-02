// Team data for 2026 F1 season
export interface TeamInfo {
  name: string;
  color: string;
  secondaryColor: string;
  drivers: string[];
}

export const TEAMS_2026: Record<string, TeamInfo> = {
  'McLaren': {
    name: 'McLaren',
    color: '#FF8000',
    secondaryColor: '#47C7FC',
    drivers: ['L. Norris', 'O. Piastri']
  },
  'Red Bull Racing': {
    name: 'Red Bull Racing',
    color: '#3671C6',
    secondaryColor: '#FCD700',
    drivers: ['M. Verstappen', 'I. Hadjar']
  },
  'Ferrari': {
    name: 'Ferrari',
    color: '#E8002D',
    secondaryColor: '#FFF200',
    drivers: ['C. Leclerc', 'L. Hamilton']
  },
  'Mercedes': {
    name: 'Mercedes',
    color: '#27F4D2',
    secondaryColor: '#000000',
    drivers: ['G. Russell', 'K. Antonelli']
  },
  'Aston Martin': {
    name: 'Aston Martin',
    color: '#229971',
    secondaryColor: '#CEDC00',
    drivers: ['F. Alonso', 'L. Stroll']
  },
  'Alpine': {
    name: 'Alpine',
    color: '#FF87BC',
    secondaryColor: '#2293D1',
    drivers: ['P. Gasly', 'F. Colapinto']
  },
  'Williams': {
    name: 'Williams',
    color: '#64C4FF',
    secondaryColor: '#041E42',
    drivers: ['A. Albon', 'C. Sainz']
  },
  'Haas': {
    name: 'Haas',
    color: '#B6BABD',
    secondaryColor: '#ED1C24',
    drivers: ['O. Bearman', 'E. Ocon']
  },
  'Audi': {
    name: 'Audi',
    color: '#FF1E00',
    secondaryColor: '#000000',
    drivers: ['N. Hulkenberg', 'G. Bortoleto']
  },
  'Cadillac': {
    name: 'Cadillac',
    color: '#000000',
    secondaryColor: '#B8860B',
    drivers: ['V. Bottas', 'S. Perez']
  },
  'Racing Bulls': {
    name: 'Racing Bulls',
    color: '#6692FF',
    secondaryColor: '#1E3A8A',
    drivers: ['L. Lawson', 'A. Lindblad']
  }
};

// Helper function to get team by driver name
export function getTeamByDriver(driverName: string): TeamInfo | null {
  for (const team of Object.values(TEAMS_2026)) {
    if (team.drivers.includes(driverName)) {
      return team;
    }
  }
  return null;
}

// Helper function to get team color by driver
export function getDriverTeamColor(driverName: string): string {
  const team = getTeamByDriver(driverName);
  return team?.color || '#6B7280'; // Default gray
}
