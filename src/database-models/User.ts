import { Role, } from '.';

export type User = {
    userName?: string;
    normalizedUserName?: string;
    normalizedEmail?: string;
    emailConfirmed: boolean;
    passwordHash?: string;
    securityStamp?: string;
    concurrencyStamp?: string;
    phoneNumber?: string;
    phoneNumberConfirmed: boolean;
    twoFactorEnabled: boolean;
    lockoutEnd?: string;
    lockoutEnabled: boolean;
    accessFailedCount: number;
    id?: string;
    password: string;
    address: string;
    device: string;
    onlineHoursDay: {
      ticks: number;
      days: number;
      hours: number;
      milliseconds: number;
      microseconds: number;
      nanoseconds: number;
      minutes: number;
      seconds: number;
      totalDays: number;
      totalHours: number;
      totalMilliseconds: number;
      totalMicroseconds: number;
      totalNanoseconds: number;
      totalMinutes: number;
      totalSeconds: number;
    };
    onlineHoursWeek: {
        ticks: number;
        days: number;
        hours: number;
        milliseconds: number;
        microseconds: number;
        nanoseconds: number;
        minutes: number;
        seconds: number;
        totalDays: number;
        totalHours: number;
        totalMilliseconds: number;
        totalMicroseconds: number;
        totalNanoseconds: number;
        totalMinutes: number;
        totalSeconds: number;
    };
    dateChanged: string;
    passwordChange: string;
    email?: string;
    roleId: number;
    role: Role;
};