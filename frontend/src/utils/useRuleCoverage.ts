import { useFetch } from './useFetch';
import { Status } from '../types/RuleMetadata';

type Version = string | { since: string, until: string };
type RuleCoverage = Record<string, Record<string, Version>>;

const languageToSonarpedia = new Map<string, string[]>(Object.entries({
  'abap': ['ABAP'],
  'apex': ['APEX'],
  'cfamily': ['CPP', 'C', 'OBJC'],
  'cobol': ['COBOL'],
  'csharp': ['CSH'],
  'vbnet': ['VBNET'],
  'css': ['CSS'],
  'flex': ['FLEX'],
  'kotlin': ['KOTLIN'],
  'scala': ['SCALA'],
  'ruby': ['RUBY'],
  'go': ['GO'],
  'java': ['JAVA'],
  'javascript': ['JAVASCRIPT', 'JS', 'TYPESCRIPT'],
  'php': ['PHP'],
  'pli': ['PLI'],
  'plsql': ['PLSQL'],
  'python': ['PY'],
  'rpg': ['RPG'],
  'secrets': ['SECRETS'],
  'swift': ['SWIFT'],
  'tsql': ['TSQL'],
  'vb6': ['VB'],
  'WEB': ['WEB'],
  'xml': ['XML'],
  'html': ['HTML'],
  'cloudformation': ['CLOUDFORMATION'],
  'terraform': ['TERRAFORM'],
  'kubernetes': ['KUBERNETES'],
  'text': ['TEXT']
}));

export function useRuleCoverage() {
  const coveredRulesUrl = `${process.env.PUBLIC_URL}/covered_rules.json`;
  const [coveredRules, coveredRulesError, coveredRulesIsLoading] = useFetch<RuleCoverage>(coveredRulesUrl);

  function ruleCoverageForSonarpediaKeys(languageKeys: string[], ruleKeys: string[], mapper: any) {
    if (coveredRulesError) {
      return 'Failed Loading';
    }
    if (coveredRulesIsLoading) {
      return 'Loading';
    }
    if (!coveredRules) {
      throw new Error('coveredRules is empty');
    }
    const result: any[] = [];
    languageKeys.forEach(language => {
      ruleKeys.forEach(ruleKey => {
        if (language in coveredRules && ruleKey in coveredRules[language]) {
          result.push(mapper(language, coveredRules[language][ruleKey]))
        }
      });
    });
    if (result.length > 0) {
      return result;
    } else {
      return 'Not Covered';
    }
  }

  function ruleCoverage(language: string, ruleKeys: string[], mapper: any) {
    const languageKeys = languageToSonarpedia.get(language);
    if (!languageKeys) {
      return 'Nonsupported language';
    }
    return ruleCoverageForSonarpediaKeys(languageKeys, ruleKeys, mapper);
  }

  function allLangsRuleCoverage(ruleKeys: string[], mapper: any) {
    const allLanguageKeys = Array.from(languageToSonarpedia.values()).flat();
    return ruleCoverageForSonarpediaKeys(allLanguageKeys, ruleKeys, mapper);
  }

  type AnalyzerState = 'covered' | 'targeted' | 'removed' | 'closed' | 'deprecated';
  function analyzerStateFromCoverageAndStatus(coverage: Version[], status: Status): AnalyzerState {
    if (coverage.length > 0) {
      if (coverage.some(version => typeof version === 'string')) {
        // if there is at least one coverage with simple (string) type, rule is still part of analyzer
        if (status === 'deprecated' || status === 'superseded') {
          return 'deprecated';
        } else {
          return 'covered';
        }
      } else {
        // all coverages keep an analyzer versions range which means the rule was removed
        return 'removed';
      }
    } else if (status === 'closed') {
      return 'closed';
    } else {
      return 'targeted';
    }
  }

  function ruleStateInAnalyzer(language: string, ruleKeys: string[], status: Status): AnalyzerState {
    const languageKeys = languageToSonarpedia.get(language);
    if (!languageKeys || coveredRulesError || coveredRulesIsLoading) {
      if (coveredRulesError) {
        console.error(`Failed to retrieve coverage for following languages: ${languageKeys} (${coveredRulesError})`);
      }
      return 'targeted';
    }
    if (!coveredRules) {
      throw new Error('coveredRules is empty');
    }

    const result: Version[] = [];
    languageKeys.forEach(lang =>
      ruleKeys.forEach(ruleKey => {
        if (lang in coveredRules && ruleKey in coveredRules[lang]) {
          result.push(coveredRules[lang][ruleKey]);
        }
      })
    );

    return analyzerStateFromCoverageAndStatus(result, status);
  }

  return {ruleCoverage, allLangsRuleCoverage, ruleStateInAnalyzer};
}

export const RULE_STATE = {
  'covered': {
    // blue
    'color': '#4c9bd6',
    'darker': '#25699d'
  },
  'targeted': {
    // same as covered but should be displayed as outline
    'color': '#4c9bd6',
    'darker': '#25699d'
  },
  'removed': {
    // red
    'color': '#C72B28',
    'darker': '#8D1B19'
  },
  'deprecated' : {
    // orange
    'color': '#FD7D20',
    'darker': '#E26003'
  },
  'closed' : {
    // dark grey
    'color': '#505050',
    'darker': '#202020'
  }
}
