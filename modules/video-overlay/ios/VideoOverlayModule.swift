import AVFoundation
import ExpoModulesCore
import QuartzCore
import UIKit

public class VideoOverlayModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VideoOverlay")

    AsyncFunction("burnIn") { (
      sourceUri: String,
      destinationUri: String,
      cuesArg: [[String: Any]],
      position: String
    ) async throws -> String in
      let sourceURL = try VideoOverlayModule.url(fromUri: sourceUri)
      let destURL = try VideoOverlayModule.url(fromUri: destinationUri)

      // Pre-clear destination if exists
      try? FileManager.default.removeItem(at: destURL)

      let cues: [Cue] = cuesArg.compactMap { dict in
        guard let text = dict["text"] as? String,
              let startMs = (dict["startMs"] as? NSNumber)?.doubleValue,
              let endMs = (dict["endMs"] as? NSNumber)?.doubleValue else {
          return nil
        }
        return Cue(text: text, startSec: startMs / 1000.0, endSec: endMs / 1000.0)
      }

      let outURL = try await VideoOverlayModule.export(
        source: sourceURL,
        destination: destURL,
        cues: cues,
        position: VerticalPosition(rawValue: position) ?? .top
      )
      return outURL.absoluteString
    }
  }

  private static func url(fromUri uri: String) throws -> URL {
    if let u = URL(string: uri), u.scheme != nil {
      return u
    }
    return URL(fileURLWithPath: uri)
  }

  private static func export(
    source: URL,
    destination: URL,
    cues: [Cue],
    position: VerticalPosition
  ) async throws -> URL {
    let asset = AVURLAsset(url: source, options: [
      AVURLAssetPreferPreciseDurationAndTimingKey: true
    ])

    let videoTracks = try await asset.loadTracks(withMediaType: .video)
    guard let assetVideoTrack = videoTracks.first else {
      throw NSError(domain: "VideoOverlay", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "No video track in source file"
      ])
    }

    let duration = try await asset.load(.duration)
    let preferredTransform = try await assetVideoTrack.load(.preferredTransform)
    let naturalSize = try await assetVideoTrack.load(.naturalSize)
    let nominalFrameRate = try await assetVideoTrack.load(.nominalFrameRate)

    // Compute the rendered (transformed) size.
    let transformedRect = CGRect(origin: .zero, size: naturalSize)
      .applying(preferredTransform)
    let renderSize = CGSize(
      width: abs(transformedRect.width),
      height: abs(transformedRect.height)
    )

    // Build composition
    let composition = AVMutableComposition()
    let timeRange = CMTimeRange(start: .zero, duration: duration)

    guard let compositionVideoTrack = composition.addMutableTrack(
      withMediaType: .video,
      preferredTrackID: kCMPersistentTrackID_Invalid
    ) else {
      throw NSError(domain: "VideoOverlay", code: 2, userInfo: [
        NSLocalizedDescriptionKey: "Could not add video track to composition"
      ])
    }
    try compositionVideoTrack.insertTimeRange(timeRange, of: assetVideoTrack, at: .zero)
    compositionVideoTrack.preferredTransform = preferredTransform

    let audioTracks = try await asset.loadTracks(withMediaType: .audio)
    if let assetAudioTrack = audioTracks.first,
       let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
       ) {
      try compositionAudioTrack.insertTimeRange(timeRange, of: assetAudioTrack, at: .zero)
    }

    // Video composition with overlay layers
    let videoComposition = AVMutableVideoComposition()
    let frameRate = nominalFrameRate > 0 ? nominalFrameRate : 30
    videoComposition.frameDuration = CMTime(value: 1, timescale: CMTimeScale(round(frameRate)))
    videoComposition.renderSize = renderSize

    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compositionVideoTrack)
    layerInstruction.setTransform(preferredTransform, at: .zero)

    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = timeRange
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]

    // Build CALayer tree for overlays.
    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.isGeometryFlipped = false

    let videoLayer = CALayer()
    videoLayer.frame = parentLayer.bounds
    parentLayer.addSublayer(videoLayer)

    // Build a card layer per cue, time-gated via animations.
    for cue in cues {
      let cardLayer = makeCardLayer(
        text: cue.text,
        renderSize: renderSize,
        position: position
      )
      // Hide by default
      cardLayer.opacity = 0

      let appear = CABasicAnimation(keyPath: "opacity")
      appear.fromValue = 0
      appear.toValue = 1
      appear.duration = 0.001
      appear.beginTime = max(AVCoreAnimationBeginTimeAtZero, cue.startSec)
      appear.fillMode = .forwards
      appear.isRemovedOnCompletion = false
      cardLayer.add(appear, forKey: "appear")

      if cue.endSec > cue.startSec {
        let disappear = CABasicAnimation(keyPath: "opacity")
        disappear.fromValue = 1
        disappear.toValue = 0
        disappear.duration = 0.001
        disappear.beginTime = max(AVCoreAnimationBeginTimeAtZero, cue.endSec)
        disappear.fillMode = .forwards
        disappear.isRemovedOnCompletion = false
        cardLayer.add(disappear, forKey: "disappear")
      }

      parentLayer.addSublayer(cardLayer)
    }

    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer,
      in: parentLayer
    )

    // Export
    guard let exporter = AVAssetExportSession(
      asset: composition,
      presetName: AVAssetExportPresetHighestQuality
    ) else {
      throw NSError(domain: "VideoOverlay", code: 3, userInfo: [
        NSLocalizedDescriptionKey: "Could not create exporter"
      ])
    }
    exporter.outputURL = destination
    exporter.outputFileType = .mov
    exporter.videoComposition = videoComposition
    exporter.shouldOptimizeForNetworkUse = true

    await exporter.export()

    switch exporter.status {
    case .completed:
      return destination
    case .failed:
      throw exporter.error ?? NSError(domain: "VideoOverlay", code: 4, userInfo: [
        NSLocalizedDescriptionKey: "Export failed"
      ])
    case .cancelled:
      throw NSError(domain: "VideoOverlay", code: 5, userInfo: [
        NSLocalizedDescriptionKey: "Export cancelled"
      ])
    default:
      throw NSError(domain: "VideoOverlay", code: 6, userInfo: [
        NSLocalizedDescriptionKey: "Export ended in unexpected state \(exporter.status.rawValue)"
      ])
    }
  }

  private static func makeCardLayer(
    text: String,
    renderSize: CGSize,
    position: VerticalPosition
  ) -> CALayer {
    let isPortrait = renderSize.height > renderSize.width
    let cardWidth = renderSize.width * (isPortrait ? 0.86 : 0.7)
    let horizontalPadding: CGFloat = 28
    let verticalPadding: CGFloat = 22

    // Reasonable font sizing based on render size.
    let fontSize = max(28, min(renderSize.width, renderSize.height) * (isPortrait ? 0.06 : 0.045))
    let font = UIFont.systemFont(ofSize: fontSize, weight: .heavy)

    // Compute text height needed for given width.
    let textBoundingWidth = cardWidth - horizontalPadding * 2
    let attributes: [NSAttributedString.Key: Any] = [
      .font: font,
      .foregroundColor: UIColor.white,
      .paragraphStyle: {
        let p = NSMutableParagraphStyle()
        p.alignment = .center
        p.lineBreakMode = .byWordWrapping
        return p
      }()
    ]
    let attributed = NSAttributedString(string: text, attributes: attributes)
    let textBoundingRect = attributed.boundingRect(
      with: CGSize(width: textBoundingWidth, height: .greatestFiniteMagnitude),
      options: [.usesLineFragmentOrigin, .usesFontLeading],
      context: nil
    )
    let textHeight = ceil(textBoundingRect.height)
    let cardHeight = textHeight + verticalPadding * 2

    // Y origin: AVFoundation overlays use an unflipped coordinate system where
    // y=0 is the BOTTOM of the video (Core Animation default). We want:
    //   "top" of the video = high y in this system (renderSize.height - margin - cardHeight)
    //   "bottom" of the video = low y (just margin)
    let topMargin: CGFloat = max(60, renderSize.height * 0.06)
    let bottomMargin: CGFloat = max(60, renderSize.height * 0.06)
    let cardY: CGFloat
    switch position {
    case .top:
      cardY = renderSize.height - topMargin - cardHeight
    case .middle:
      cardY = (renderSize.height - cardHeight) / 2
    case .bottom:
      cardY = bottomMargin
    }
    let cardX = (renderSize.width - cardWidth) / 2

    let card = CALayer()
    card.frame = CGRect(x: cardX, y: cardY, width: cardWidth, height: cardHeight)
    card.backgroundColor = UIColor.black.withAlphaComponent(0.78).cgColor
    card.cornerRadius = 22
    card.masksToBounds = true
    card.borderColor = UIColor(white: 1, alpha: 0.08).cgColor
    card.borderWidth = 1

    let textLayer = CATextLayer()
    textLayer.string = attributed
    textLayer.alignmentMode = .center
    textLayer.isWrapped = true
    textLayer.contentsScale = UIScreen.main.scale
    textLayer.frame = CGRect(
      x: horizontalPadding,
      y: verticalPadding,
      width: cardWidth - horizontalPadding * 2,
      height: textHeight
    )
    card.addSublayer(textLayer)

    return card
  }
}

private struct Cue {
  let text: String
  let startSec: Double
  let endSec: Double
}

private enum VerticalPosition: String {
  case top
  case middle
  case bottom
}
