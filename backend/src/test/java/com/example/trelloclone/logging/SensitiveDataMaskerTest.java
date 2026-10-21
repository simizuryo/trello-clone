package com.example.trelloclone.logging;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class SensitiveDataMaskerTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "password=hunter2                     | password=****",
            "login failed: PASSWORD = hunter2 x   | login failed: PASSWORD = **** x",
            "{\"password\":\"hunter2\",\"id\":1}  | {\"password\":\"****\",\"id\":1}",
            "token: abc.def.ghi                   | token: ****",
            "url?api_key=XYZ123&page=2            | url?api_key=****&page=2",
            "access-token=a1b2                    | access-token=****",
            "client_secret=s3cr3t                 | client_secret=****",
            "Authorization: Bearer eyJhbGciOi.x-y | Authorization: **** ****",
            "header bearer abc123==               | header bearer ****",
            "contact alice.smith+tag@example.co.jp | contact ****@example.co.jp",
    })
    void masksSecretsAndPersonalData(String input, String expected) {
        assertThat(SensitiveDataMasker.mask(input)).isEqualTo(expected);
    }

    @Test
    void leavesOrdinaryTextUntouched() {
        String text = "HTTP request completed method=GET path=/api/cards status=200 durationMs=12";
        assertThat(SensitiveDataMasker.mask(text)).isSameAs(text);
    }

    @Test
    void handlesNullAndEmpty() {
        assertThat(SensitiveDataMasker.mask(null)).isNull();
        assertThat(SensitiveDataMasker.mask("")).isEmpty();
    }

    @Test
    void valueMaskerOnlyReturnsAValueWhenSomethingWasMasked() {
        SensitiveValueMasker masker = new SensitiveValueMasker();
        assertThat(masker.mask(null, "nothing secret")).isNull();
        assertThat(masker.mask(null, 42)).isNull();
        assertThat(masker.mask(null, "password=x")).isEqualTo("password=****");
    }
}
