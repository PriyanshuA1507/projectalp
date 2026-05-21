// import { Api } from '../api/Api.js';

// class DashboardService {
//     constructor() {
//         this.api = new Api(import.meta.env.VITE_BASEURL);
//     }

//     // 🚀 UPDATED: Accepts the selected year parameter from your Dashboard component
//     async getStats(year) {
//         const endpoint = year && year !== 'All' 
//             ? `/dashboard/stats?academic_year=${year}` 
//             : '/dashboard/stats';
            
//         return this.api.get(endpoint);
//     }
// }

// export const dashboardService = new DashboardService();
import { Api } from '../api/Api.js';

class DashboardService {
    constructor() {
        this.api = new Api(import.meta.env.VITE_BASEURL);
    }

    // 🚀 UPDATED: Now dynamically maps multiple filters at once
    async getStats(year, department) {
        const queryParams = new URLSearchParams();

        if (year && year !== 'All') {
            queryParams.append('academic_year', year);
        }
        if (department && department !== 'All') {
            queryParams.append('department_id', department);
        }

        const queryString = queryParams.toString();
        const endpoint = queryString ? `/dashboard/stats?${queryString}` : '/dashboard/stats';

        return this.api.get(endpoint);
    }
}

export const dashboardService = new DashboardService();