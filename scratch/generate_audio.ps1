Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# Select high quality installed voice
$voices = $synth.GetInstalledVoices()
foreach ($v in $voices) {
    if ($v.VoiceInfo.Name -like "*Zira*" -or $v.VoiceInfo.Name -like "*David*") {
        $synth.SelectVoice($v.VoiceInfo.Name)
        break
    }
}
$synth.Rate = 0  # Normal speaking rate
$synth.Volume = 100

$outputDir = "C:\Users\nisha\.gemini\antigravity-ide\brain\19eb44da-6b1f-476b-81fd-bd450af5f031\audio"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$scripts = @(
    @{
        Name = "part1_analyze.wav"
        Text = "Every developer knows the pain of Dependabot or Snyk opening 40 pull requests after a routine scan. Most of these alerts are false alarms or transitive duplicates. Today, we are introducing KEYSTONE, a graph-native vulnerability remediation agent powered by FalkorDB. Let us load the infamous Log4Shell scenario from a standard CycloneDX SBOM. Watch how quickly FalkorDB parses and links the entire dependency graph in under 10 milliseconds."
    },
    @{
        Name = "part2_dashboard.wav"
        Text = "Welcome to the KEYSTONE command center. Instead of overwhelming you with separate tickets, KEYSTONE runs a graph-native Greedy Set Cover algorithm over FalkorDB. Four critical alerts have been compressed down to one single Keystone action, an 86 percent alert reduction. With one click on Auto-Triage, KEYSTONE's graph agent verifies exploit paths and defers unreachable noise."
    },
    @{
        Name = "part3_blast_radius.wav"
        Text = "Let us drill into CVE-2021-44228. Here is our live Cytoscape graph canvas. We do not just see a CVE badge; we see the full attack path from our root application down through Spring Boot into Log4j-core. Notice the What-If simulation slider. By selecting version 2.17.1, KEYSTONE simulates the dependency replacement, confirming that this single upgrade eliminates all downstream attack vectors without introducing breaking API changes."
    },
    @{
        Name = "part4_remediation.wav"
        Text = "Next, let us visit the Remediation Engine. KEYSTONE groups fixes into topologically sorted batches. Before recommending any upgrade, KEYSTONE executes GRAPH.COPY in FalkorDB to create an isolated clone of your dependency graph. It tests the upgrade in sandbox isolation, proving that no circular dependencies or version conflicts will occur. In the Approval Queue, security engineers maintain human-in-the-loop control with automated PR previews."
    },
    @{
        Name = "part5_sentinel.wav"
        Text = "Finally, meet Sentinel, our real-time graph agent that continuously guards against new CVE disclosures. With responsive cursor tracking and instant Cypher triage, Sentinel keeps software supply chains secure. In summary, KEYSTONE replaces alert fatigue with graph-native precision, sub-millisecond Cypher queries, and automated remediation proofs. Thank you to FalkorDB and WeMakeDevs for hosting this hackathon."
    }
)

foreach ($item in $scripts) {
    $filePath = Join-Path $outputDir $item.Name
    $synth.SetOutputToWaveFile($filePath)
    $synth.Speak($item.Text)
    $synth.SetOutputToNull()
    Write-Host "Generated audio: $filePath"
}
Write-Host "All voiceover audio tracks generated successfully!"
