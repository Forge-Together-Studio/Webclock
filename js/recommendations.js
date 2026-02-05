/**
 * AI Recommendation Engine for Care Home Ratings
 *
 * Generates actionable improvement recommendations based on CMS Five-Star
 * Quality Rating System methodology and industry best practices.
 */

const RecommendationEngine = (() => {

    const RATING_LABELS = {
        5: 'Much Above Average',
        4: 'Above Average',
        3: 'Average',
        2: 'Below Average',
        1: 'Much Below Average',
        0: 'Not Available'
    };

    function getRatingLabel(rating) {
        return RATING_LABELS[rating] || 'Not Available';
    }

    function getPriorityLevel(rating) {
        if (rating <= 1) return 'critical';
        if (rating <= 2) return 'high';
        if (rating <= 3) return 'medium';
        return 'low';
    }

    // ── Health Inspection Recommendations ──

    function getHealthInspectionRecs(rating, data) {
        const recs = [];

        if (rating <= 2) {
            recs.push({
                title: 'Conduct comprehensive internal mock surveys',
                detail: 'Schedule quarterly mock surveys using the CMS State Operations Manual as your guide. Focus on the most commonly cited deficiency tags (F-tags) and address findings within 30 days.'
            });
            recs.push({
                title: 'Implement a robust Quality Assurance & Performance Improvement (QAPI) program',
                detail: 'Establish a dedicated QAPI committee that meets weekly to review incident reports, complaints, and near-misses. Use root cause analysis for all identified deficiencies and track corrective actions to completion.'
            });
            recs.push({
                title: 'Strengthen infection prevention and control protocols',
                detail: 'Ensure your Infection Preventionist has dedicated time for surveillance. Update antibiotic stewardship programs, hand hygiene audits, and environmental cleaning protocols per CDC guidelines.'
            });
        }

        if (rating <= 3) {
            recs.push({
                title: 'Reduce health deficiency citations',
                detail: 'Analyze your past 3 survey cycles to identify recurring deficiency categories. Develop targeted action plans for each pattern area. Common focus areas include fall prevention, pressure ulcer management, and medication management.'
            });
            recs.push({
                title: 'Improve complaint investigation and resolution',
                detail: 'Establish a formal complaint tracking system with 24-hour acknowledgment and 10-day resolution targets. Substantiated complaints negatively impact your inspection rating. Train all staff on complaint handling protocols.'
            });
            recs.push({
                title: 'Enhance resident assessment accuracy',
                detail: 'Audit MDS assessments for accuracy and timeliness. Ensure care plans reflect current resident needs and are updated after every significant change in condition. Inaccurate assessments are a frequent source of deficiency citations.'
            });
        }

        if (rating <= 4) {
            recs.push({
                title: 'Maintain survey readiness year-round',
                detail: 'Implement daily "survey-ready" checklists for each department. Conduct unannounced weekend and evening walk-throughs to identify gaps. Focus on dining experience, resident dignity, and environmental safety.'
            });
            recs.push({
                title: 'Focus on person-centered care documentation',
                detail: 'Ensure care plans incorporate resident preferences and goals. Document how staff honor individual choices for daily routines, meals, and activities. Surveyors increasingly focus on person-centered care compliance.'
            });
        }

        const numDeficiencies = extractNumber(data, 'number_of_health_deficiencies', 'total_number_of_health_deficiencies');
        if (numDeficiencies !== null && numDeficiencies > 5) {
            recs.push({
                title: `Address your ${numDeficiencies} cited health deficiencies`,
                detail: 'Each deficiency directly impacts your health inspection score. Prioritize correcting any deficiencies categorized as "immediate jeopardy" or "actual harm," then address those at the "potential for harm" level.'
            });
        }

        const numComplaints = extractNumber(data, 'number_of_substantiated_complaints');
        if (numComplaints !== null && numComplaints > 0) {
            recs.push({
                title: `Resolve substantiated complaints (${numComplaints} on record)`,
                detail: 'Substantiated complaints are factored into your health inspection rating. Implement a proactive complaint resolution program. Consider appointing a resident advocate to address concerns before they become formal complaints.'
            });
        }

        return recs;
    }

    // ── Staffing Recommendations ──

    function getStaffingRecs(rating, data) {
        const recs = [];

        if (rating <= 2) {
            recs.push({
                title: 'Increase total nursing hours per resident day (HPRD)',
                detail: 'CMS uses Payroll-Based Journal (PBJ) data to calculate staffing ratings. Aim for at least 4.1 total nursing HPRD. Evaluate your staffing model and consider adding positions strategically during high-need shifts.'
            });
            recs.push({
                title: 'Boost RN staffing hours significantly',
                detail: 'RN hours are weighted heavily in the staffing calculation. CMS expects a minimum RN HPRD of approximately 0.55. Consider hiring additional RNs, converting LPN positions to RN positions where appropriate, and ensuring consistent RN weekend coverage.'
            });
            recs.push({
                title: 'Reduce staff turnover rates',
                detail: 'High turnover (reported to CMS via PBJ data) negatively impacts your staffing rating. Implement retention strategies: competitive pay, flexible scheduling, career ladder programs, mentorship for new hires, and a positive workplace culture.'
            });
        }

        if (rating <= 3) {
            recs.push({
                title: 'Improve weekend staffing levels',
                detail: 'CMS specifically evaluates weekend staffing. Ensure your weekend total nursing HPRD is not significantly lower than weekday levels. Consider weekend differential pay to attract staff.'
            });
            recs.push({
                title: 'Reduce reliance on agency/temporary staff',
                detail: 'While not directly penalized, high agency usage can indicate staffing instability. Develop a permanent staffing pool with PRN (as-needed) employees who are familiar with your residents and protocols.'
            });
            recs.push({
                title: 'Address administrator turnover',
                detail: 'CMS tracks administrator turnover. Frequent leadership changes destabilize operations. Invest in competitive administrator compensation and provide support structures to retain leadership.'
            });
        }

        if (rating <= 4) {
            recs.push({
                title: 'Ensure PBJ data accuracy',
                detail: 'Your staffing rating is calculated from Payroll-Based Journal submissions. Audit your PBJ data entry process to ensure all nursing hours (including training, orientation, and administrative time for nursing staff) are correctly captured.'
            });
            recs.push({
                title: 'Optimize staffing mix and scheduling',
                detail: 'Review your RN-to-LPN-to-CNA ratio against top-performing facilities. Ensure adequate RN coverage on all shifts. Consider implementing acuity-based staffing that adjusts to real-time resident needs.'
            });
        }

        const rnHours = extractNumber(data, 'reported_rn_staffing_hours_per_resident_per_day', 'rn_staffing_hours_per_resident_per_day');
        if (rnHours !== null && rnHours < 0.55) {
            recs.push({
                title: `Increase RN hours (currently ${rnHours} HPRD)`,
                detail: `Your reported RN hours per resident day of ${rnHours} is below the recommended threshold. Top-rated facilities typically achieve 0.75+ RN HPRD. Each additional 0.1 RN HPRD can meaningfully impact your staffing rating.`
            });
        }

        const totalHours = extractNumber(data, 'reported_total_nurse_staffing_hours_per_resident_per_day', 'total_nurse_staffing_hours_per_resident_per_day');
        if (totalHours !== null && totalHours < 4.1) {
            recs.push({
                title: `Increase total nursing hours (currently ${totalHours} HPRD)`,
                detail: `Your total nursing HPRD of ${totalHours} is below the level typically needed for a high staffing rating. Top-rated facilities average above 4.5 HPRD. Focus on adding CNA hours and RN hours proportionally.`
            });
        }

        const turnover = extractNumber(data, 'total_nursing_staff_turnover', 'number_of_nurse_staff_turnover');
        if (turnover !== null) {
            const pct = turnover > 1 ? turnover : turnover * 100;
            if (pct > 50) {
                recs.push({
                    title: `Address high staff turnover (${pct.toFixed(1)}%)`,
                    detail: 'Turnover above 50% significantly impacts care quality and your staffing rating. Exit interviews, competitive wages, and improved working conditions are the most effective interventions.'
                });
            }
        }

        return recs;
    }

    // ── Quality Measure Recommendations ──

    function getQualityMeasureRecs(rating, data) {
        const recs = [];

        if (rating <= 2) {
            recs.push({
                title: 'Launch targeted improvement programs for lowest-scoring QMs',
                detail: 'Review your facility\'s performance on all 15+ quality measures reported to CMS. Identify the 3-4 measures where you perform worst relative to national averages and create dedicated improvement teams for each.'
            });
            recs.push({
                title: 'Strengthen fall prevention program',
                detail: 'Falls and fall-related injuries are high-weight quality measures. Implement evidence-based fall prevention: individualized risk assessments, environmental modifications, exercise programs, medication reviews, and post-fall huddles.'
            });
            recs.push({
                title: 'Improve pressure ulcer prevention and management',
                detail: 'New or worsening pressure ulcers are a critical quality measure. Ensure consistent skin assessments, proper repositioning schedules, nutrition optimization, and appropriate support surfaces for at-risk residents.'
            });
        }

        if (rating <= 3) {
            recs.push({
                title: 'Reduce unnecessary antipsychotic medication use',
                detail: 'Antipsychotic use (without a diagnosis of specific mental health conditions) is a closely watched quality measure. Implement gradual dose reduction programs, train staff in behavioral management techniques, and review each case quarterly.'
            });
            recs.push({
                title: 'Improve urinary tract infection (UTI) prevention',
                detail: 'UTI rates are tracked as a quality measure. Focus on catheter reduction programs (CAUTI bundles), proper hydration protocols, perineal care, and early identification of UTI symptoms.'
            });
            recs.push({
                title: 'Optimize functional outcome measures',
                detail: 'CMS tracks residents\' ability to maintain or improve physical functioning. Enhance your restorative nursing program and ensure all residents receive appropriate levels of physical, occupational, and speech therapy.'
            });
        }

        if (rating <= 4) {
            recs.push({
                title: 'Improve MDS coding accuracy for quality measures',
                detail: 'Quality measures are calculated from MDS data. Incorrect coding can make your QMs appear worse than reality. Invest in regular MDS coordinator training and conduct quarterly coding accuracy audits.'
            });
            recs.push({
                title: 'Reduce emergency department visits and rehospitalizations',
                detail: 'Rehospitalization rates are a quality measure. Implement the INTERACT program (Interventions to Reduce Acute Care Transfers) and ensure timely physician notification protocols for changes in condition.'
            });
            recs.push({
                title: 'Enhance pain management protocols',
                detail: 'Self-reported moderate-to-severe pain is a quality measure. Implement structured pain assessments using validated tools, ensure timely analgesic administration, and explore non-pharmacological interventions.'
            });
        }

        return recs;
    }

    // ── General / Cross-cutting Recommendations ──

    function getGeneralRecs(overallRating, data) {
        const recs = [];

        if (overallRating <= 3) {
            recs.push({
                title: 'Engage external quality improvement consultants',
                detail: 'Consider partnering with your state\'s Quality Improvement Organization (QIO) — these are free, CMS-funded resources. They can conduct on-site reviews and help develop targeted improvement plans.'
            });
            recs.push({
                title: 'Benchmark against top-performing facilities in your state',
                detail: 'Use CMS Care Compare to identify 5-star facilities of similar size in your region. Research their publicly available data to understand where their performance differs from yours and adapt proven strategies.'
            });
        }

        if (overallRating <= 4) {
            recs.push({
                title: 'Build a culture of continuous quality improvement',
                detail: 'Embed quality into daily operations, not just committee meetings. Use huddles, visual management boards, and frontline staff empowerment. Celebrate improvements publicly and recognize staff contributions to quality.'
            });
            recs.push({
                title: 'Invest in staff training and education',
                detail: 'Go beyond minimum required training. Provide ongoing competency-based education in high-impact areas: dementia care, wound management, medication safety, and communication skills. Well-trained staff drive all three rating components.'
            });
        }

        const isSFF = extractField(data, 'special_focus_status', 'special_focus_facility');
        if (isSFF && typeof isSFF === 'string' && isSFF.toLowerCase().includes('special focus')) {
            recs.push({
                title: 'Address Special Focus Facility (SFF) designation urgently',
                detail: 'As a Special Focus Facility, your overall rating is capped at 3 stars regardless of other scores. Resolving SFF status requires sustained improvement across all survey cycles. Work closely with your state survey agency to understand specific expectations.'
            });
        }

        return recs;
    }

    // ── Utility functions ──

    function extractNumber(data, ...fieldNames) {
        if (!data) return null;
        for (const field of fieldNames) {
            for (const key of Object.keys(data)) {
                if (normalizeField(key) === normalizeField(field)) {
                    const val = parseFloat(data[key]);
                    if (!isNaN(val)) return val;
                }
            }
        }
        return null;
    }

    function extractField(data, ...fieldNames) {
        if (!data) return null;
        for (const field of fieldNames) {
            for (const key of Object.keys(data)) {
                if (normalizeField(key) === normalizeField(field)) {
                    return data[key];
                }
            }
        }
        return null;
    }

    function normalizeField(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    // ── Main function ──

    function generateRecommendations(facility) {
        const overall = parseInt(facility._overallRating) || 0;
        const health = parseInt(facility._healthRating) || 0;
        const staffing = parseInt(facility._staffingRating) || 0;
        const qm = parseInt(facility._qmRating) || 0;

        if (overall === 5 && health === 5 && staffing === 5 && qm === 5) {
            return { isPerfect: true, categories: [] };
        }

        const categories = [];

        // Determine which areas need the most improvement, prioritize lowest ratings
        const areas = [
            { key: 'health', label: 'Health Inspection', rating: health, icon: 'health' },
            { key: 'staffing', label: 'Staffing', rating: staffing, icon: 'staffing' },
            { key: 'qm', label: 'Quality Measures', rating: qm, icon: 'quality' }
        ].sort((a, b) => a.rating - b.rating);

        for (const area of areas) {
            let recs = [];
            if (area.key === 'health') recs = getHealthInspectionRecs(area.rating, facility);
            if (area.key === 'staffing') recs = getStaffingRecs(area.rating, facility);
            if (area.key === 'qm') recs = getQualityMeasureRecs(area.rating, facility);

            if (recs.length > 0) {
                categories.push({
                    label: area.label,
                    icon: area.icon,
                    currentRating: area.rating,
                    priority: getPriorityLevel(area.rating),
                    recommendations: recs.slice(0, 5) // Cap at 5 per category
                });
            }
        }

        // Add general recommendations
        const generalRecs = getGeneralRecs(overall, facility);
        if (generalRecs.length > 0) {
            categories.push({
                label: 'General Strategy',
                icon: 'general',
                currentRating: overall,
                priority: getPriorityLevel(overall),
                recommendations: generalRecs.slice(0, 4)
            });
        }

        return { isPerfect: false, categories };
    }

    return { generateRecommendations, getRatingLabel };
})();
