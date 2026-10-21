package com.example.trelloclone.logging;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Masks secrets and personal data inside free-form log text. Shared by the JSON
 * encoder ({@link SensitiveValueMasker}) and the plain-text pattern ({@link MaskingConverter})
 * so both output formats apply the same rules.
 */
public final class SensitiveDataMasker {

    public static final String MASK = "****";

    private record Rule(Pattern pattern, String replacement) {
    }

    private static final List<Rule> RULES = List.of(
            // "Bearer eyJhbGci..." -> "Bearer ****"
            new Rule(Pattern.compile("(?i)(bearer\\s+)[A-Za-z0-9\\-._~+/]+=*"), "$1" + MASK),
            // password=..., "token": "...", api_key: ... -> keep the key, mask the value
            new Rule(Pattern.compile(
                    "(?i)(\"?(?:password|passwd|pwd|secret|client[_-]?secret|token|access[_-]?token|refresh[_-]?token"
                            + "|api[_-]?key|authorization)\"?\\s*[:=]\\s*\"?)([^\\s\",&;]+)"),
                    "$1" + MASK),
            // user@example.com -> ****@example.com
            new Rule(Pattern.compile("[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})"), MASK + "@$1")
    );

    private SensitiveDataMasker() {
    }

    public static String mask(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        String result = text;
        for (Rule rule : RULES) {
            Matcher matcher = rule.pattern().matcher(result);
            if (matcher.find()) {
                result = matcher.replaceAll(rule.replacement());
            }
        }
        return result;
    }
}
