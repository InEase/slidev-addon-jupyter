import { get, MaybeRef, set } from "@vueuse/core";
// @ts-ignore
import sha1 from "sha1";
import { data, send, status as wbStatus } from "./WebSocket";
import { ref, Ref, watch } from "vue";

type JupyterBlockStatus = "free" | "evaluating" | "fail" | "disconnected";

export function useJupyterBlock(code: MaybeRef<string>) {
    // jupyter cell binds with initial code sha, so here we need to pass code as parameter
    code = ref(code)
    const output = ref<string>("")
    let status: Ref<JupyterBlockStatus> = ref("free")
    const hash = sha1("code" + code.value)
    console.log(code.value, `\n--------------\n[${hash.slice(0, 6)}] Register`)

    function evaluate() {
        status.value = "evaluating"
        output.value = ''
        let data = {kind: 'reevaluate', hashids: [hash]}
        send(JSON.stringify(data))
    }

    function set_code() {
        send(JSON.stringify({kind: 'set_code', hashid: hash, code: get(code)}))
    }

    // should be called during page change
    function get_code() {
        send(JSON.stringify({kind: 'get_code', hashid: hash}))
    }

    function get_output() {
        send(JSON.stringify({kind: 'get_output', hashid: hash}))
    }

    function interrupt() {
        status.value = "free"
        send(JSON.stringify({kind: 'interrupt_kernel'}))
    }

    watch(data, (data) => {
        const msg = JSON.parse(data);
        if (msg.hashid === hash) {
            if (msg.kind === 'code') {
                // @ts-ignore
                set(code, msg.code)
            } else if (msg.kind === 'output') {
                status.value = "free"
                output.value = msg.output
            }
        }
    })

    watch(wbStatus, (wbStatus) => {
        if (wbStatus === "CLOSED") {
            status.value = "disconnected"
        }
    })

    return {status, evaluate, set_code, get_code, get_output, interrupt, output}
}