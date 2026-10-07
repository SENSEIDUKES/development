import { useState, useMemo } from 'react';
import { StoryMemory, StoryWorld, Chapter, StoryArc, Character } from '../types';

export function useCodexAnalytics(
  memory: StoryMemory,
  arcs: StoryArc[],
  activeStory: StoryWorld,
  selectedChartCharId: string,
  mcName: string
) {
  const flatChapters = useMemo(() => {
    const list: Array<{
      chapter: Chapter;
      arcTitle: string;
      arcIndex: number;
      isFirstInArc: boolean;
    }> = [];
    
    arcs.forEach((arc, aIdx) => {
      const written = (arc.chapters || []).filter(ch => ch.hasContent || !!ch.generatedContent);
      written.forEach((ch, cIndex) => {
        list.push({
          chapter: ch,
          arcTitle: arc.title || `Arc Vol ${aIdx + 1}`,
          arcIndex: aIdx,
          isFirstInArc: cIndex === 0,
        });
      });
    });
    
    return list;
  }, [arcs]);

  function getPowerRankScore(powerStr: string | undefined): { score: number, title: string } {
    if (!powerStr) return { score: 10, title: 'Mortal Tier' };
    const p = powerStr.toLowerCase();
    
    if (p.includes('primordial') || p.includes('sovereign') || p.includes('god') || p.includes('ancestor') || p.includes('immortal emperor') || p.includes('grade 10') || p.includes('tier 10')) {
      return { score: 100, title: 'Primordial Sovereignty' };
    }
    if (p.includes('nascent') || p.includes('saint') || p.includes('sss') || p.includes('tribulation') || p.includes('grade 9') || p.includes('grade 8')) {
      return { score: 85, title: 'Nascent Saint Ascendancy' };
    }
    if (p.includes('formation') || p.includes('grandmaster') || p.includes('rank a') || p.includes('grade 6') || p.includes('grade 7')) {
      return { score: 70, title: 'Core Formation Grandmaster' };
    }
    if (p.includes('foundation') || p.includes('establishment') || p.includes('master') || p.includes('grade 4') || p.includes('grade 5')) {
      return { score: 55, title: 'Foundation Establishment' };
    }
    if (p.includes('qi') || p.includes('refining') || p.includes('condensation') || p.includes('disciple') || p.includes('grade 2') || p.includes('grade 3')) {
      return { score: 35, title: 'Qi Refining Tier' };
    }
    if (p.includes('crippled') || p.includes('mortal') || p.includes('disabled') || p.includes('grade 1')) {
      return { score: 12, title: 'Mortal Meridian Blockade' };
    }
    return { score: 40, title: 'Spiritual Adept' };
  }

  const powerTimeline = useMemo(() => {
    const list: Array<{
      chapterNumber: number;
      title: string;
      score: number;
      stageName: string;
      breakthrough: boolean;
      summary?: string;
      cuePayload?: any;
    }> = [];

    flatChapters.forEach((fc, idx) => {
      const ch = fc.chapter;
      let stageName = memory.currentPowerStage || 'Qi Condensation';
      
      const finalScoreRef = getPowerRankScore(memory.currentPowerStage).score;
      const initialScoreRef = 15;
      
      const text = `${ch.statsChangeMessage || ''} ${ch.summary || ''} ${ch.title || ''}`.toLowerCase();
      let estScore = initialScoreRef;
      let breakthrough = false;

      if (text.includes('nascent soul') || text.includes('nascent')) {
        estScore = 85;
        stageName = 'Nascent Soul';
        breakthrough = true;
      } else if (text.includes('core formation') || text.includes('grandmaster')) {
        estScore = 70;
        stageName = 'Core Formation';
        breakthrough = true;
      } else if (text.includes('foundation') || text.includes('establishment')) {
        estScore = 55;
        stageName = 'Foundation Establishment';
        breakthrough = true;
      } else if (text.includes('tier 7') || text.includes('tier 8') || text.includes('tier 9') || text.includes('tier 10')) {
        estScore = 45;
        stageName = 'Qi Refining Late Stage';
        breakthrough = true;
      } else if (text.includes('tier 4') || text.includes('tier 5') || text.includes('tier 6')) {
        estScore = 32;
        stageName = 'Qi Refining Mid Stage';
        breakthrough = true;
      } else if (text.includes('tier 1') || text.includes('tier 2') || text.includes('tier 3')) {
        estScore = 20;
        stageName = 'Qi Refining Early Stage';
      } else {
        const ratio = flatChapters.length > 1 ? idx / (flatChapters.length - 1) : 1;
        estScore = Math.round(initialScoreRef + (finalScoreRef - initialScoreRef) * ratio);
      }

      if (ch.cuePayload?.powerShift) {
        estScore += ch.cuePayload.powerShift;
        breakthrough = true;
      }

      list.push({
        chapterNumber: ch.number,
        title: ch.title,
        score: Math.min(100, Math.max(10, estScore)),
        stageName: stageName,
        breakthrough,
        summary: ch.summary || ch.statsChangeMessage || 'Sensing gradual increase in raw spiritual reserves.',
        cuePayload: ch.cuePayload
      });
    });

    return list;
  }, [flatChapters, memory.currentPowerStage]);

  const affinityTimelineOfChar = useMemo(() => {
    if (!selectedChartCharId) return [];
    const char = memory.characters?.find(c => c.id === selectedChartCharId);
    if (!char) return [];

    const bond = activeStory.relationships?.find(
      r => r.sourceCharId === selectedChartCharId || r.targetCharId === selectedChartCharId
    );
    const targetAffinity = bond ? bond.affinity : 0;

    const relString = (char.relationshipToMC || '').toLowerCase();
    const startAff = relString.includes('hostil') || relString.includes('enemy')
      ? -45
      : relString.includes('friend') || relString.includes('ally') || relString.includes('mentor')
      ? 35
      : 0;

    const list: Array<{
      chapterNumber: number;
      title: string;
      affinity: number;
      eventSummary: string;
      hasInteraction: boolean;
    }> = [];

    const total = flatChapters.length;
    flatChapters.forEach((fc, idx) => {
      const ch = fc.chapter;
      const text = `${ch.generatedContent || ''} ${ch.summary || ''} ${ch.title || ''}`.toLowerCase();
      const hasInteraction = text.includes((char.name || '').toLowerCase());

      let baseInterpolated = startAff;
      if (total > 1) {
        baseInterpolated = startAff + (targetAffinity - startAff) * (idx / (total - 1));
      } else {
        baseInterpolated = targetAffinity;
      }

      let spike = 0;
      if (hasInteraction) {
        if (text.includes('attack') || text.includes('clash') || text.includes('betray') || text.includes('wound') || text.includes('mock')) {
          spike = -15;
        } else if (text.includes('save') || text.includes('trust') || text.includes('help') || text.includes('gift') || text.includes('reconcile')) {
          spike = 15;
        } else {
          spike = 5;
        }
      }

      const affinityVal = Math.min(100, Math.max(-100, Math.round(baseInterpolated + spike)));

      let summary = `${char.name} was not present in this chapter of the saga.`;
      if (hasInteraction) {
        if (spike < 0) {
          summary = `Hostility sparked: ${char.name} engaged in a tense conflict or clash of perspectives with ${mcName}.`;
        } else if (spike > 0) {
          summary = `Bonds strengthened: ${char.name} and ${mcName} shared an exchange of trust, assistance, or mutual protection.`;
        } else {
          summary = `${char.name} appeared, their active karma threads vibrating inside the chapter narrative.`;
        }
      }

      list.push({
        chapterNumber: ch.number,
        title: ch.title,
        affinity: affinityVal,
        eventSummary: summary,
        hasInteraction
      });
    });

    return list;
  }, [selectedChartCharId, flatChapters, memory.characters, activeStory.relationships, mcName]);

  const getPowerStageLevel = (stageName?: string): { score: number, title: string } => {
    if (!stageName) return { score: 10, title: 'Mortal' };
    
    // Clean up stage name for title - remove parenthetical notes like (Crippled Roots) or (Fragile Destiny Line)
    let cleanTitle = stageName.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    if (!cleanTitle) cleanTitle = stageName.trim();
    
    const p = stageName.toLowerCase();
    const hasWord = (word: string) => {
      const escaped = word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`).test(p);
    };
    
    // 1. Primordial/Sovereign/God/Ancestor/Immortal Emperor/Tier 10
    if (
      hasWord('primordial') || 
      hasWord('sovereign') || 
      hasWord('god') || 
      hasWord('ancestor') || 
      hasWord('immortal emperor') || 
      hasWord('tier x') || 
      hasWord('tier 10')
    ) {
      return { score: 100, title: cleanTitle };
    }
    
    // 2. Nascent / Saint / SSS / Tribulation / Tier 9 / Tier 8
    if (
      hasWord('nascent') || 
      hasWord('saint') || 
      hasWord('sss') || 
      hasWord('tribulation') || 
      hasWord('tier ix') || 
      hasWord('tier viii') || 
      hasWord('tier 9') || 
      hasWord('tier 8')
    ) {
      let score = 85;
      if (hasWord('early') || hasWord('tier 8') || hasWord('tier viii')) score = 80;
      if (hasWord('late') || hasWord('peak') || hasWord('tier 9') || hasWord('tier ix')) score = 89;
      return { score, title: cleanTitle };
    }
    
    // 3. Core Formation / Grandmaster / Rank A / Tier 7 / Tier 6
    if (
      hasWord('formation') || 
      hasWord('grandmaster') || 
      hasWord('rank a') || 
      hasWord('tier vii') || 
      hasWord('tier vi') || 
      hasWord('tier 7') || 
      hasWord('tier 6')
    ) {
      let score = 70;
      if (hasWord('early') || hasWord('tier 6') || hasWord('tier vi')) score = 65;
      if (hasWord('late') || hasWord('peak') || hasWord('tier 7') || hasWord('tier vii')) score = 74;
      return { score, title: cleanTitle };
    }
    
    // 4. Foundation / Establishment / Master / Tier 5 / Tier 4
    if (
      hasWord('foundation') || 
      hasWord('establishment') || 
      hasWord('master') || 
      hasWord('tier v') || 
      hasWord('tier iv') || 
      hasWord('tier 5') || 
      hasWord('tier 4')
    ) {
      let score = 55;
      if (hasWord('early') || hasWord('tier 4') || hasWord('tier iv')) score = 50;
      if (hasWord('late') || hasWord('peak') || hasWord('tier 5') || hasWord('tier v')) score = 59;
      return { score, title: cleanTitle };
    }
    
    // 5. Qi / Refining / Condensation / Disciple / Apprentice / Tier 3 / Tier 2
    if (
      hasWord('qi') || 
      hasWord('refining') || 
      hasWord('condensation') || 
      hasWord('disciple') || 
      hasWord('apprentice') || 
      hasWord('initiate') || 
      hasWord('tier iii') || 
      hasWord('tier ii') || 
      hasWord('tier 3') || 
      hasWord('tier 2')
    ) {
      let score = 35;
      if (hasWord('early') || hasWord('tier 1') || hasWord('tier i') || hasWord('class f')) score = 20;
      else if (hasWord('mid') || hasWord('tier 2') || hasWord('tier ii') || hasWord('tier 4') || hasWord('tier 5') || hasWord('tier 6')) score = 32;
      else if (hasWord('late') || hasWord('peak') || hasWord('tier 3') || hasWord('tier iii') || hasWord('tier 7') || hasWord('tier 8') || hasWord('tier 9') || hasWord('tier 10')) score = 45;
      return { score, title: cleanTitle };
    }
    
    // 6. Crippled / Mortal / Disabled / Seeker / Unranked / Blocked / Tier 1 / Tier I
    if (
      hasWord('crippled') || 
      hasWord('mortal') || 
      hasWord('disabled') || 
      hasWord('seeker') || 
      hasWord('unranked') || 
      hasWord('blocked') || 
      hasWord('tier i') || 
      hasWord('tier 1')
    ) {
      let score = 12;
      if (p.includes('resonance')) {
        const match = p.match(/(\d+)%/);
        if (match) {
          const pct = parseInt(match[1]);
          score = Math.min(100, Math.max(10, Math.round(10 + pct * 0.9)));
        }
      }
      return { score, title: cleanTitle };
    }

    // 7. Resonance percentage
    if (p.includes('resonance')) {
      const match = p.match(/(\d+)%/);
      if (match) {
        const pct = parseInt(match[1]);
        const score = Math.min(100, Math.max(10, Math.round(10 + pct * 0.9)));
        return { score, title: cleanTitle };
      }
    }

    // 8. Tier Roman Numerals
    const romanMatch = p.match(/\btier\s+([ivx]+)\b/i);
    if (romanMatch) {
      const roman = romanMatch[1].toUpperCase();
      const romanScores: Record<string, number> = {
        'I': 15, 'II': 30, 'III': 45, 'IV': 60, 'V': 75,
        'VI': 85, 'VII': 90, 'VIII': 95, 'IX': 98, 'X': 100
      };
      if (romanScores[roman] !== undefined) {
        return { score: romanScores[roman], title: cleanTitle };
      }
    }
    
    // 9. Tier Numeric
    const numMatch = p.match(/\btier\s+(\d+)\b/);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      const score = Math.min(100, Math.max(10, num * 10));
      return { score, title: cleanTitle };
    }

    return { score: 40, title: cleanTitle };
  };

  return {
    flatChapters,
    powerTimeline,
    affinityTimelineOfChar,
    getPowerRankScore,
    getPowerStageLevel,
  };
}
