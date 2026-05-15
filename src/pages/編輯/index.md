---
title: 編輯
---

Herein are samples of my editing.

Each editing sample below consists of a file with the published version of the review and the editing process as well as a separate file containing raw BBcode of the review at various stages of its completion. All three, but particularly the Ultimate Zombie Defense 2 and VLADiK Brutal reviews, required substantial editing. My job was to catch all grammatical and mechanical errors and to ensure the review met our standards for coverage. I did my best to leave everything else in the hands of the author; hence, slang, references, and the occasional bit of profanity went generally untouched, and the tone leans conversational.

The game reviews:

- [Terminus Zombie Survivors — final and editing](</編輯/Terminus Zombie Survivors/Terminus Zombie Survivors Final and Editing/>)
- [Terminus Zombie Survivors — BBcode source](</編輯/Terminus Zombie Survivors/Terminus BBcode/>)
- [Ultimate Zombie Defense 2 — final and editing](</編輯/Ultimate Zombie Defense 2/Ultimate Zombie Defense 2 Final and Editing/>)
- [Ultimate Zombie Defense 2 — BBcode source](</編輯/Ultimate Zombie Defense 2/UZD2 BBcode/>)
- [VLADiK Brutal — final and editing](</編輯/VLADiK Brutal/VLADiK BRUTAL Final and Editing/>)
- [VLADiK Brutal — BBcode source](</編輯/VLADiK Brutal/VLADiK BBcode/>)

## Review Style Guide

The below is a brief style guide I wrote for game reviews published on a message board of which I am a moderator. It was mainly meant to address formatting questions specific to our custom version of phpBB, but I also included guidelines concerning a couple of the most common errors I had seen in editing. It was agreed between the editors that any unaddressed topic would be referred to *The Chicago Manual of Style*.

I am aware that my use of single quotes to distinguish quotations of sentence fragments from those of whole sentences is idiosyncratic, but it is a distinction I would like to see become standard.

〇 marks examples of proper formatting. ✖ marks examples of improper formatting.

### Grammar and Punctuation

#### Quotations

When quoting, enclose the quotation in double quotes. When quoting a full sentence, if the outer sentence coterminates with the quotation, no punctuation following the final quotation is necessary.

〇 He asked, "Do I need to add punctuation after the quotation mark?"  
〇 "Only if the sentence continues after the quotation ends," I said.

✖ "Is this punctuation in error?".  
✖ "I can't bear to look upon it!".

Do not place punctuation inside quotation marks that belongs to the outer sentence. If the outer sentence ends with the quotation and there is no terminating punctuation mark in the quotation, the punctuation is placed after the final quotation mark.

〇 I am sometimes called a 'pedant'.

✖ I wish they would more often call me a 'traditionalist.'

#### Titles

Titles of games and other complete works are to be italicized. Punctuation following an italicized title is not to be italicized unless it is part of the title.

〇 I have been enjoying *Monster Hunter Frontier*!

✖ Have you played *Monster Hunter Frontier?*  
✖ I wish more people would play "Monster Hunter Frontier" with me.

### Formatting

#### Images

Images should be hosted in one of the following formats: jpeg, webp, or avif. Smaller file sizes make for faster loading, and game screenshots are already lossy in the first place.

Images and captions should be formatted like so:

```
Review text.


[align=center][img]image.jpg[/img]
[i]Caption, if present.[/i][/align]


Text continues.
```

The align tags consume one empty line on both sides, so a second blank line on both sides is necessary for spacing. For technical reasons, images should be uploaded to the vault and embedded via img tags, not attachments.

#### Sectioning

When splitting a review into separate untitled sections, use hr tags to divide them like so:

```
Review text.

[hr]
Text continues.
```

When splitting a review into separate titled sections, use heading tags to begin each new section like so:

```
Review text.

[heading=X]Heading[/heading]
Text continues.
```

X determines the size of the heading. It can be any number from 1 to 5.
