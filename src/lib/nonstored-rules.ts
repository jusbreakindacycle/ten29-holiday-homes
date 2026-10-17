// A conservative ingress guard, not a semantic classifier for arbitrary images/text.
export function referencesHouseRules(value:string){return /house[\s_-]*rules|house\s*rules/i.test(value);}
