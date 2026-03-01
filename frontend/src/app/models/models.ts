export interface Profile {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    dimensions: string[];
    auditCount?: number;
}

export interface Question {
    id: string;
    text: string;
    type: 'text' | 'single' | 'multiple' | 'scale' | 'boolean';
    options: string[];
    section: 'general' | 'specific';
    dimension: string;
    weight: number;
}

export interface AuditScores {
    overall: number;
    level: string;
    levelLabel: string;
    levelColor: string;
    levelEmoji: string;
    dimensions: Record<string, number>;
    recommendations: string[];
}

export interface Audit {
    id: string;
    profileId: string;
    profileName: string;
    profileIcon: string;
    profileColor: string;
    profileDimensions?: string[];
    respondentName: string;
    respondentEmail: string;
    answers: Record<string, any>;
    scores: AuditScores;
    created_at: string;
}

export interface QuestionsResponse {
    general: Question[];
    specific: Question[];
}
